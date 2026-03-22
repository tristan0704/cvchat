/**
 * Voice Interview Page
 *
 * Session Lifecycle:
 * 1. User clicks "Start" -> startCall()
 *    - Validates browser capabilities (secure context, getUserMedia, MediaRecorder)
 *    - Fetches a scoped Gemini Live auth token from /api/gemini/live-token
 *    - Opens an AudioContext and connects to Gemini Live via WebSocket
 *    - Starts the microphone pipeline (MediaStream -> ScriptProcessor -> Gemini)
 *    - Starts a parallel MediaRecorder for the post-call transcription
 *    - Plays a deterministic host-owned greeting from a pre-generated asset
 *    - Sends the initial prompt only after the greeting has completed
 *    - Starts the countdown timer (default 5 min) after the greeting
 *
 * 2. During the call:
 *    - Mic audio is downsampled to 16 kHz, converted to PCM16, and sent as base64
 *    - Gemini streams back audio chunks + live transcription events
 *    - Audio chunks are decoded and scheduled for gapless playback
 *    - Transcription events are buffered and flushed into the transcript log
 *
 * 3. Closing sequence (time-based phases):
 *    - T-40s: host detaches the realtime session and asks one fixed final question
 *    - T-15s: every end reason funnels through requestGracefulStop()
 *    - Host-owned farewell plays from a pre-generated asset
 *    - stopCall() runs only after farewell completion or hard timeout
 *
 * 4. stopCall() teardown:
 *    - Stops MediaRecorder, collects recorded blob
 *    - Closes Gemini session and disconnects audio nodes
 *    - Stops mic tracks, closes AudioContext
 *    - Triggers face analysis via FaceLandmarkPanel.stopAndAnalyze()
 *    - Sends recorded audio to /api/interview/transcript for transcription
 *    - Persists all state to sessionStorage for feedback page handoff
 */

"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { GoogleGenAI, LiveServerMessage, MediaResolution, Modality, Session, type LiveCallbacks } from "@google/genai"
import { FaceLandmarkPanel, type FaceLandmarkPanelHandle } from "@/components/interview/face-landmark-panel"
import { formatCountdown, getInterviewQuestionPool } from "@/lib/interview"
import {
    decodePcm16,
    downsampleBuffer,
    encodeBase64,
    floatTo16BitPcm,
    getSupportedRecordingMimeType,
    INPUT_SAMPLE_RATE,
    parseSampleRate,
} from "@/lib/audio"
import {
    buildTranscriptQaPairs,
    buildTranscriptQaExport,
    normalizeTranscriptText,
    persistVoiceFeedbackDraft,
    type PostCallTranscriptStatus,
    type Speaker,
    type TranscriptEntry,
} from "@/lib/transcript"
import {
    getFarewellPhrase,
    getLastQuestionPhrase,
    getTechnicalErrorFarewellPhrase,
    HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS,
    resolveGreetingPhrase,
    resolveOpeningQuestionPhrase,
    HOST_CLOSING_HARD_STOP_TIMEOUT_MS,
    type HostVoicePhrase,
} from "@/lib/voice-host"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"
const LIVE_VOICE = "Zephyr"
const AUDIO_INPUT_WORKLET_PATH = "/audio/voice-host/pcm-input-worklet.js"
const CALL_DURATION_SECONDS = 300
const LAST_QUESTION_LEAD_SECONDS = 40
const FINAL_INTERRUPT_LEAD_SECONDS = 15

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionStatus = "idle" | "connecting" | "connected" | "error"
type CallLifecyclePhase = "idle" | "opening" | "interviewing" | "closing" | "stopping"
type ClosingPhase = "idle" | "armed" | "last-question" | "finalizing"
type StopReason = "timer" | "manual" | "goAway" | "technicalError"
type LiveTokenResponse = { token: string; model: string; voiceName: string }
type AsyncResult<T> = { ok: true; value: T } | { ok: false; error: string }
type CallTiming = {
    startedAtMs: number
    targetEndAtMs: number
    lastQuestionAtMs: number
    finalInterruptAtMs: number
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function createCallTiming(startedAtMs = Date.now()): CallTiming {
    return {
        startedAtMs,
        targetEndAtMs: startedAtMs + CALL_DURATION_SECONDS * 1_000,
        lastQuestionAtMs: startedAtMs + (CALL_DURATION_SECONDS - LAST_QUESTION_LEAD_SECONDS) * 1_000,
        finalInterruptAtMs: startedAtMs + (CALL_DURATION_SECONDS - FINAL_INTERRUPT_LEAD_SECONDS) * 1_000,
    }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function VoiceInterview({ role }: { role: string }) {
    const questionPlan = getInterviewQuestionPool(role)
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle")
    const [error, setError] = useState("")
    const [microphoneSupported, setMicrophoneSupported] = useState(false)
    const [recorderSupported, setRecorderSupported] = useState(false)
    const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
    const [playbackActive, setPlaybackActive] = useState(false)
    const [postCallCandidateTranscript, setPostCallCandidateTranscript] = useState("")
    const [postCallTranscriptStatus, setPostCallTranscriptStatus] = useState<PostCallTranscriptStatus>("idle")
    const [postCallTranscriptError, setPostCallTranscriptError] = useState("")
    const [callLifecyclePhase, setCallLifecyclePhase] = useState<CallLifecyclePhase>("idle")
    const [secondsLeft, setSecondsLeft] = useState(CALL_DURATION_SECONDS)
    // Memoize Q&A pairs to avoid recomputing on every render
    const transcriptQaPairs = useMemo(() => buildTranscriptQaPairs(transcriptEntries), [transcriptEntries])

    // -- Refs: Gemini session & audio pipeline --
    const sessionRef = useRef<Session | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const microphoneStreamRef = useRef<MediaStream | null>(null)
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const processorNodeRef = useRef<AudioWorkletNode | null>(null)
    const silentGainRef = useRef<GainNode | null>(null)

    // -- Refs: Audio playback scheduling --
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([])
    const nextPlaybackTimeRef = useRef(0)

    // -- Refs: Transcript tracking --
    const transcriptCounterRef = useRef(0)
    const pendingCandidateTranscriptRef = useRef("")
    const pendingInterviewerTranscriptRef = useRef("")
    const lastCandidateTranscriptRef = useRef("")
    const lastInterviewerTranscriptRef = useRef("")

    // -- Refs: Closing sequence coordination --
    const closingRequestedRef = useRef(false)
    const closingPhaseRef = useRef<ClosingPhase>("idle")
    const finalQuestionTriggeredRef = useRef(false)
    const finalInterruptTriggeredRef = useRef(false)
    const candidateAudioSuppressedRef = useRef(false)
    const realtimeSessionDetachedRef = useRef(false)
    const localSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const fixedPhraseAudioRef = useRef<HTMLAudioElement | null>(null)
    const hostPlaybackSequenceRef = useRef(0)
    const gracefulStopInFlightRef = useRef(false)
    const closingHardStopTimerRef = useRef<number | null>(null)

    // -- Refs: Call lifecycle guards --
    const stopCallRef = useRef<((options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) => Promise<void>) | null>(null)
    const connectionStatusRef = useRef<ConnectionStatus>("idle")
    const callLifecyclePhaseRef = useRef<CallLifecyclePhase>("idle")
    const startCallInFlightRef = useRef(false)
    const stopCallInFlightRef = useRef(false)
    const callTimingRef = useRef<CallTiming | null>(null)

    /**
     * Refs that shadow state values so that callbacks (which capture stale
     * closures) can always read the latest value. This pattern is necessary
     * because Gemini session callbacks are registered once at connect time
     * and cannot be updated.
     */
    const transcriptEntriesRef = useRef<TranscriptEntry[]>([])
    const postCallCandidateTranscriptRef = useRef("")
    const postCallTranscriptStatusRef = useRef<PostCallTranscriptStatus>("idle")
    const postCallTranscriptErrorRef = useRef("")

    // -- Refs: MediaRecorder for post-call transcription --
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedAudioChunksRef = useRef<Blob[]>([])
    const recordedAudioMimeTypeRef = useRef("")

    // -- Refs: Face landmark panel --
    const faceLandmarkPanelRef = useRef<FaceLandmarkPanelHandle | null>(null)

    // -- State-to-ref sync effects --
    // These keep refs in sync - so stale closures always read fresh values.
    useEffect(() => { connectionStatusRef.current = connectionStatus }, [connectionStatus])
    useEffect(() => { callLifecyclePhaseRef.current = callLifecyclePhase }, [callLifecyclePhase])
    useEffect(() => { transcriptEntriesRef.current = transcriptEntries }, [transcriptEntries])
    useEffect(() => { postCallCandidateTranscriptRef.current = postCallCandidateTranscript }, [postCallCandidateTranscript])
    useEffect(() => { postCallTranscriptStatusRef.current = postCallTranscriptStatus }, [postCallTranscriptStatus])
    useEffect(() => { postCallTranscriptErrorRef.current = postCallTranscriptError }, [postCallTranscriptError])

    useEffect(() => {
        const secureMic = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
        setMicrophoneSupported(secureMic)
        setRecorderSupported(secureMic && !!getSupportedRecordingMimeType())
    }, [])

    useEffect(() => {
        persistVoiceFeedbackDraft({
            role,
            transcriptEntries,
            postCallCandidateTranscript,
            postCallTranscriptStatus,
            postCallTranscriptError,
        })
    }, [role, transcriptEntries, postCallCandidateTranscript, postCallTranscriptStatus, postCallTranscriptError])

    // -- State update helpers --

    function updateConnectionStatus(nextStatus: ConnectionStatus) {
        connectionStatusRef.current = nextStatus
        setConnectionStatus(nextStatus)
    }

    function updateCallLifecyclePhase(nextPhase: CallLifecyclePhase) {
        callLifecyclePhaseRef.current = nextPhase
        setCallLifecyclePhase(nextPhase)
    }

    const updateClosingPhase = useCallback((nextPhase: ClosingPhase) => {
        closingPhaseRef.current = nextPhase
    }, [])

    const clearClosingHardStopTimer = useCallback(() => {
        if (closingHardStopTimerRef.current === null || typeof window === "undefined") return
        window.clearTimeout(closingHardStopTimerRef.current)
        closingHardStopTimerRef.current = null
    }, [])

    const syncCountdown = useCallback(() => {
        const targetEndAtMs = callTimingRef.current?.targetEndAtMs
        if (!targetEndAtMs) {
            setSecondsLeft(CALL_DURATION_SECONDS)
            return
        }

        const remainingMs = Math.max(0, targetEndAtMs - Date.now())
        setSecondsLeft(Math.ceil(remainingMs / 1_000))
    }, [])

    /**
     * Disconnect the active microphone processing graph and clear the refs so
     * later lifecycle transitions can safely rebuild it from scratch.
     */
    const resetRealtimeAudioPipeline = useCallback(() => {
        processorNodeRef.current?.port.close()
        processorNodeRef.current?.disconnect()
        sourceNodeRef.current?.disconnect()
        silentGainRef.current?.disconnect()
        processorNodeRef.current = null
        sourceNodeRef.current = null
        silentGainRef.current = null
    }, [])

    const resetTranscriptTrackingRefs = useCallback(() => {
        pendingCandidateTranscriptRef.current = ""
        pendingInterviewerTranscriptRef.current = ""
        lastCandidateTranscriptRef.current = ""
        lastInterviewerTranscriptRef.current = ""
    }, [])

    const resetClosingStateRefs = useCallback((candidateAudioSuppressed: boolean) => {
        closingRequestedRef.current = false
        candidateAudioSuppressedRef.current = candidateAudioSuppressed
        realtimeSessionDetachedRef.current = false
        finalQuestionTriggeredRef.current = false
        finalInterruptTriggeredRef.current = false
        gracefulStopInFlightRef.current = false
    }, [])

    // -- Transcript helpers --

    const appendTranscript = useCallback((speaker: Speaker, text: string, options?: { mergeWithPrevious?: boolean }) => {
        const normalized = normalizeTranscriptText(text)
        if (!normalized) return

        setTranscriptEntries((prev) => {
            const lastEntry = prev[prev.length - 1]
            if (options?.mergeWithPrevious !== false && lastEntry?.speaker === speaker) {
                return [...prev.slice(0, -1), { ...lastEntry, text: `${lastEntry.text} ${normalized}`.trim() }]
            }

            transcriptCounterRef.current += 1
            return [...prev, { id: `${speaker}-${transcriptCounterRef.current}`, speaker, text: normalized }]
        })
    }, [])

    const exportTranscriptAsTxt = useCallback(() => {
        if (typeof window === "undefined") return

        const content = buildTranscriptQaExport(role, transcriptEntriesRef.current)
        if (!content) return

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `voice-transcript-${role.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "export"}.txt`
        anchor.click()
        window.URL.revokeObjectURL(url)
    }, [role])

    const flushFinishedTranscript = useCallback(
        (speaker: Extract<Speaker, "candidate" | "interviewer">, text: string) => {
            const normalized = normalizeTranscriptText(text)
            if (!normalized) return

            const lastTranscriptRef = speaker === "candidate" ? lastCandidateTranscriptRef : lastInterviewerTranscriptRef
            if (lastTranscriptRef.current === normalized) return

            lastTranscriptRef.current = normalized
            appendTranscript(speaker, normalized, { mergeWithPrevious: false })
        },
        [appendTranscript]
    )

    const handleLiveTranscription = useCallback(
        (speaker: Extract<Speaker, "candidate" | "interviewer">, text?: string, finished?: boolean) => {
            const pendingTranscriptRef = speaker === "candidate" ? pendingCandidateTranscriptRef : pendingInterviewerTranscriptRef
            if (typeof text === "string" && text.trim()) {
                pendingTranscriptRef.current = text
            }

            if (finished) {
                flushFinishedTranscript(speaker, pendingTranscriptRef.current || text || "")
                pendingTranscriptRef.current = ""
            }
        },
        [flushFinishedTranscript]
    )

    // -- Host-owned fixed phrase playback --

    const cancelLocalSpeech = useCallback(() => {
        localSpeechUtteranceRef.current = null
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return
        window.speechSynthesis.cancel()
        setPlaybackActive(false)
    }, [])

    const cancelFixedPhraseAudio = useCallback(() => {
        const activeAudio = fixedPhraseAudioRef.current
        fixedPhraseAudioRef.current = null

        if (!activeAudio) {
            setPlaybackActive(false)
            return
        }

        try {
            activeAudio.pause()
            activeAudio.src = ""
            activeAudio.load()
        } catch {}

        setPlaybackActive(false)
    }, [])

    /**
     * Bump the playback sequence and stop every host-owned audio source.
     * This ensures that a newer lifecycle transition can never overlap with
     * an older greeting/farewell playback promise.
     */
    const cancelHostPlayback = useCallback(() => {
        hostPlaybackSequenceRef.current += 1
        cancelFixedPhraseAudio()
        cancelLocalSpeech()
    }, [cancelFixedPhraseAudio, cancelLocalSpeech])

    const playSpeechFallback = useCallback(
        (text: string, playbackSequence: number) =>
            new Promise<boolean>((resolve) => {
                if (typeof window === "undefined" || !("speechSynthesis" in window)) {
                    resolve(false)
                    return
                }

                window.speechSynthesis.cancel()
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.lang = "de-DE"
                utterance.rate = 1
                utterance.pitch = 1

                const finish = (result: boolean) => {
                    if (localSpeechUtteranceRef.current === utterance) {
                        localSpeechUtteranceRef.current = null
                    }
                    setPlaybackActive(false)
                    resolve(result)
                }

                utterance.onstart = () => {
                    if (hostPlaybackSequenceRef.current !== playbackSequence) {
                        window.speechSynthesis.cancel()
                        finish(false)
                        return
                    }

                    setPlaybackActive(true)
                }
                utterance.onend = () => finish(hostPlaybackSequenceRef.current === playbackSequence)
                utterance.onerror = () => finish(false)

                localSpeechUtteranceRef.current = utterance
                window.speechSynthesis.speak(utterance)
            }),
        []
    )

    /**
     * Try the pre-generated local asset first. If the browser cannot start
     * playback within a short timeout, we intentionally fall back to the
     * browser TTS so the call can still progress.
     */
    const playFixedPhraseAsset = useCallback(
        (assetPath: string, playbackSequence: number) =>
            new Promise<boolean>((resolve) => {
                if (typeof window === "undefined") {
                    resolve(false)
                    return
                }

                const audio = new Audio(assetPath)
                fixedPhraseAudioRef.current = audio
                audio.preload = "auto"

                let settled = false
                let playbackStarted = false
                const startTimeoutId = window.setTimeout(() => finish(false), HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS)

                const cleanup = () => {
                    window.clearTimeout(startTimeoutId)
                    audio.onplaying = null
                    audio.onended = null
                    audio.onerror = null
                }

                const finish = (result: boolean) => {
                    if (settled) return
                    settled = true
                    cleanup()

                    if (fixedPhraseAudioRef.current === audio) {
                        fixedPhraseAudioRef.current = null
                    }

                    try {
                        if (!audio.ended) {
                            audio.pause()
                        }
                        audio.src = ""
                        audio.load()
                    } catch {}

                    setPlaybackActive(false)
                    resolve(result)
                }

                audio.onplaying = () => {
                    if (hostPlaybackSequenceRef.current !== playbackSequence) {
                        finish(false)
                        return
                    }

                    // The timeout is only meant to detect assets that never
                    // begin playback. Once the browser confirms playback, the
                    // host must not fall back to browser TTS anymore.
                    window.clearTimeout(startTimeoutId)
                    playbackStarted = true
                    setPlaybackActive(true)
                }
                audio.onended = () => finish(playbackStarted && hostPlaybackSequenceRef.current === playbackSequence)
                audio.onerror = () => finish(false)

                void audio.play().catch(() => finish(false))
            }),
        []
    )

    const playHostPhrase = useCallback(
        async (phrase: HostVoicePhrase, options?: { appendTranscriptSpeaker?: Speaker }) => {
            const transcriptSpeaker = options?.appendTranscriptSpeaker ?? "interviewer"
            appendTranscript(transcriptSpeaker, phrase.text, { mergeWithPrevious: false })

            const playbackSequence = hostPlaybackSequenceRef.current + 1
            hostPlaybackSequenceRef.current = playbackSequence

            const assetPlayed = await playFixedPhraseAsset(phrase.assetPath, playbackSequence)
            if (assetPlayed) return true
            if (hostPlaybackSequenceRef.current !== playbackSequence) return false

            return await playSpeechFallback(phrase.text, playbackSequence)
        },
        [appendTranscript, playFixedPhraseAsset, playSpeechFallback]
    )

    // -- Closing sequence --

    const detachRealtimeSession = useCallback(() => {
        if (realtimeSessionDetachedRef.current) return

        realtimeSessionDetachedRef.current = true

        try {
            sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true })
        } catch {}

        sessionRef.current?.close()
        sessionRef.current = null
        resetRealtimeAudioPipeline()
        stopScheduledPlayback()
    }, [resetRealtimeAudioPipeline])

    const beginLastQuestionPhase = useCallback(() => {
        if (finalQuestionTriggeredRef.current || finalInterruptTriggeredRef.current) return

        finalQuestionTriggeredRef.current = true
        closingRequestedRef.current = true
        detachRealtimeSession()
        updateClosingPhase("last-question")
        appendTranscript("system", "Noch rund 40 Sekunden. Der Host stellt jetzt genau eine letzte Frage.")
        void playHostPhrase(getLastQuestionPhrase())
    }, [appendTranscript, detachRealtimeSession, playHostPhrase, updateClosingPhase])

    const requestGracefulStop = useCallback(
        async (reason: StopReason) => {
            if (gracefulStopInFlightRef.current || stopCallInFlightRef.current) return

            gracefulStopInFlightRef.current = true
            finalInterruptTriggeredRef.current = true
            closingRequestedRef.current = true
            candidateAudioSuppressedRef.current = true
            updateCallLifecyclePhase("closing")
            updateClosingPhase("finalizing")
            clearClosingHardStopTimer()
            cancelHostPlayback()
            stopScheduledPlayback()
            detachRealtimeSession()

            const farewellPhrase = reason === "technicalError" ? getTechnicalErrorFarewellPhrase() : getFarewellPhrase()
            const terminalStatus: ConnectionStatus = reason === "technicalError" ? "error" : "idle"

            if (reason === "goAway") {
                appendTranscript("system", "Die Live-Session meldet Restzeit. Der Host beendet den Call jetzt kontrolliert.")
            }

            if (reason === "technicalError") {
                appendTranscript("system", "Die Live-Session hatte einen technischen Fehler. Der Host beendet den Call jetzt kontrolliert.")
            }

            if (typeof window !== "undefined") {
                closingHardStopTimerRef.current = window.setTimeout(() => {
                    cancelHostPlayback()
                    void stopCallRef.current?.({ terminalStatus, closeSession: false })
                }, HOST_CLOSING_HARD_STOP_TIMEOUT_MS)
            }

            try {
                await playHostPhrase(farewellPhrase)
            } finally {
                clearClosingHardStopTimer()
                await stopCallRef.current?.({ terminalStatus, closeSession: false })
                gracefulStopInFlightRef.current = false
            }
        },
        [
            appendTranscript,
            cancelHostPlayback,
            clearClosingHardStopTimer,
            detachRealtimeSession,
            playHostPhrase,
            updateClosingPhase,
        ]
    )

    // -- Audio playback --

    function stopScheduledPlayback() {
        for (const source of scheduledSourcesRef.current) {
            try {
                source.stop()
            } catch {}
        }

        scheduledSourcesRef.current = []
        setPlaybackActive(false)
        nextPlaybackTimeRef.current = audioContextRef.current?.currentTime ?? 0
    }

    function playAudioChunk(base64: string, mimeType?: string) {
        const audioContext = audioContextRef.current
        if (!audioContext) return

        const sampleRate = parseSampleRate(mimeType)
        const samples = decodePcm16(base64)
        const audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate)
        audioBuffer.copyToChannel(samples, 0)

        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)

        const startTime = Math.max(audioContext.currentTime + 0.05, nextPlaybackTimeRef.current)
        source.start(startTime)
        setPlaybackActive(true)
        nextPlaybackTimeRef.current = startTime + audioBuffer.duration
        scheduledSourcesRef.current.push(source)

        source.onended = () => {
            scheduledSourcesRef.current = scheduledSourcesRef.current.filter((item) => item !== source)
            if (scheduledSourcesRef.current.length === 0) setPlaybackActive(false)
        }
    }

    // -- Gemini session event handlers --

    function handleServerMessage(message: LiveServerMessage) {
        if (message.serverContent?.interrupted) {
            stopScheduledPlayback()
        }

        handleLiveTranscription(
            "candidate",
            message.serverContent?.inputTranscription?.text,
            message.serverContent?.inputTranscription?.finished
        )
        handleLiveTranscription(
            "interviewer",
            message.serverContent?.outputTranscription?.text,
            message.serverContent?.outputTranscription?.finished
        )

        for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (!part.inlineData?.data) continue
            if (callLifecyclePhaseRef.current === "closing" || callLifecyclePhaseRef.current === "stopping") continue

            playAudioChunk(part.inlineData.data, part.inlineData.mimeType)
        }

        if (message.serverContent?.turnComplete && pendingInterviewerTranscriptRef.current) {
            flushFinishedTranscript("interviewer", pendingInterviewerTranscriptRef.current)
            pendingInterviewerTranscriptRef.current = ""
        }

        if (message.goAway?.timeLeft) {
            setError(`Live-Session laeuft aus. Verbleibende Zeit: ${message.goAway.timeLeft}`)
            if (callLifecyclePhaseRef.current !== "closing" && callLifecyclePhaseRef.current !== "stopping") {
                void requestGracefulStop("goAway")
            }
        }
    }

    // -- Microphone pipeline --

    function sendRealtimeAudioChunk(session: Session, input: Float32Array, sampleRate: number) {
        if (connectionStatusRef.current === "error" || connectionStatusRef.current === "idle") return
        if (candidateAudioSuppressedRef.current) return

        const downsampled = downsampleBuffer(input, sampleRate, INPUT_SAMPLE_RATE)
        const pcmBytes = floatTo16BitPcm(downsampled)

        try {
            session.sendRealtimeInput({ audio: { data: encodeBase64(pcmBytes), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` } })
        } catch {}
    }

    async function startMicrophone(audioContext: AudioContext, session: Session): Promise<AsyncResult<void>> {
        if (!navigator.mediaDevices?.getUserMedia) {
            return {
                ok: false,
                error: "Mikrofonzugriff ist in diesem Browser oder Kontext nicht verfuegbar. Nutze localhost oder HTTPS und pruefe die Browser-Berechtigung.",
            }
        }

        const recordingMimeType = getSupportedRecordingMimeType()
        if (!recordingMimeType || typeof MediaRecorder === "undefined") {
            return {
                ok: false,
                error: "MediaRecorder wird in diesem Browser nicht ausreichend unterstuetzt.",
            }
        }

        try {
            await audioContext.audioWorklet.addModule(AUDIO_INPUT_WORKLET_PATH)

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            })

            const source = audioContext.createMediaStreamSource(stream)
            const processor = new AudioWorkletNode(audioContext, "pcm-input-processor", {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
                outputChannelCount: [1],
            })
            const silentGain = audioContext.createGain()
            silentGain.gain.value = 0

            processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
                if (!(event.data instanceof Float32Array)) return
                sendRealtimeAudioChunk(session, event.data, audioContext.sampleRate)
            }

            source.connect(processor)
            processor.connect(silentGain)
            silentGain.connect(audioContext.destination)

            microphoneStreamRef.current = stream
            sourceNodeRef.current = source
            processorNodeRef.current = processor
            silentGainRef.current = silentGain

            recordedAudioChunksRef.current = []
            recordedAudioMimeTypeRef.current = recordingMimeType

            const recorder = new MediaRecorder(stream, { mimeType: recordingMimeType })
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) recordedAudioChunksRef.current.push(event.data)
            }
            recorder.start(1_000)

            mediaRecorderRef.current = recorder
            setPostCallTranscriptStatus("recording")
            setPostCallTranscriptError("")
            return { ok: true, value: undefined }
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : "Der Mikrofon- oder AudioWorklet-Start ist fehlgeschlagen.",
            }
        }
    }

    // -- Post-call processing --

    async function stopCandidateRecording() {
        const recorder = mediaRecorderRef.current
        mediaRecorderRef.current = null

        if (!recorder) return null
        if (recorder.state === "inactive") {
            if (recordedAudioChunksRef.current.length === 0) return null
            return new Blob(recordedAudioChunksRef.current, { type: recordedAudioMimeTypeRef.current || "audio/webm" })
        }

        return await new Promise<Blob | null>((resolve) => {
            recorder.onstop = () => {
                if (recordedAudioChunksRef.current.length === 0) {
                    resolve(null)
                    return
                }

                resolve(new Blob(recordedAudioChunksRef.current, { type: recordedAudioMimeTypeRef.current || recorder.mimeType || "audio/webm" }))
            }
            recorder.stop()
        })
    }

    async function transcribeCandidateAudio(audioBlob: Blob): Promise<AsyncResult<string>> {
        setPostCallTranscriptStatus("transcribing")
        setPostCallTranscriptError("")
        persistVoiceFeedbackDraft({
            role,
            transcriptEntries: transcriptEntriesRef.current,
            postCallCandidateTranscript: postCallCandidateTranscriptRef.current,
            postCallTranscriptStatus: "transcribing",
            postCallTranscriptError: "",
        })

        const formData = new FormData()
        formData.append("role", role)
        formData.append("audio", new File([audioBlob], `voice-interview.${audioBlob.type.includes("mp4") ? "mp4" : "webm"}`, { type: audioBlob.type || "audio/webm" }))

        const response = await fetch("/api/interview/transcript", {
            method: "POST",
            body: formData,
        })
        const data = (await response.json()) as { transcriptText?: string; error?: string }

        if (!response.ok || !data.transcriptText) {
            return {
                ok: false,
                error: data.error || "Post-Call-Transkription fehlgeschlagen.",
            }
        }

        setPostCallCandidateTranscript(data.transcriptText)
        setPostCallTranscriptStatus("ready")
        setPostCallTranscriptError("")
        persistVoiceFeedbackDraft({
            role,
            transcriptEntries: transcriptEntriesRef.current,
            postCallCandidateTranscript: data.transcriptText,
            postCallTranscriptStatus: "ready",
            postCallTranscriptError: "",
        })

        return {
            ok: true,
            value: data.transcriptText,
        }
    }

    // -- Start / Stop call --

    async function stopCall(options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) {
        if (stopCallInFlightRef.current) return

        stopCallInFlightRef.current = true
        const { terminalStatus = "idle", closeSession = true } = options ?? {}
        updateCallLifecyclePhase("stopping")

        try {
            clearClosingHardStopTimer()
            cancelHostPlayback()
            persistVoiceFeedbackDraft({
                role,
                transcriptEntries: transcriptEntriesRef.current,
                postCallCandidateTranscript: postCallCandidateTranscriptRef.current,
                postCallTranscriptStatus: postCallTranscriptStatusRef.current,
                postCallTranscriptError: postCallTranscriptErrorRef.current,
            })

            const recordedAudioBlob = await stopCandidateRecording().catch(() => null)

            if (closeSession) {
                try {
                    sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true })
                } catch {}

                sessionRef.current?.close()
            }

            sessionRef.current = null
            resetRealtimeAudioPipeline()

            for (const track of microphoneStreamRef.current?.getTracks() ?? []) track.stop()
            microphoneStreamRef.current = null

            stopScheduledPlayback()
            if (audioContextRef.current) await audioContextRef.current.close().catch(() => undefined)
            audioContextRef.current = null
            nextPlaybackTimeRef.current = 0
            updateConnectionStatus(terminalStatus)
            updateCallLifecyclePhase("idle")
            callTimingRef.current = null
            setSecondsLeft(CALL_DURATION_SECONDS)
            updateClosingPhase("idle")
            resetClosingStateRefs(false)
            resetTranscriptTrackingRefs()
            startCallInFlightRef.current = false
            const faceAnalysisPromise = faceLandmarkPanelRef.current?.stopAndAnalyze().catch(() => null)

            if (recordedAudioBlob && recordedAudioBlob.size > 0) {
                const transcriptionResult = await transcribeCandidateAudio(recordedAudioBlob)
                if (!transcriptionResult.ok) {
                    const message = transcriptionResult.error
                    setPostCallTranscriptStatus("error")
                    setPostCallTranscriptError(message)
                    persistVoiceFeedbackDraft({
                        role,
                        transcriptEntries: transcriptEntriesRef.current,
                        postCallCandidateTranscript: postCallCandidateTranscriptRef.current,
                        postCallTranscriptStatus: "error",
                        postCallTranscriptError: message,
                    })
                }
            }

            await faceAnalysisPromise
        } finally {
            stopCallInFlightRef.current = false
        }
    }

    stopCallRef.current = stopCall

    useEffect(() => {
        return () => {
            clearClosingHardStopTimer()
            cancelHostPlayback()
            try {
                sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true })
            } catch {}
            sessionRef.current?.close()
            resetRealtimeAudioPipeline()
            for (const track of microphoneStreamRef.current?.getTracks() ?? []) track.stop()
            for (const source of scheduledSourcesRef.current) {
                try {
                    source.stop()
                } catch {}
            }
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                void audioContextRef.current.close().catch(() => undefined)
            }
        }
    }, [cancelHostPlayback, clearClosingHardStopTimer, resetRealtimeAudioPipeline])

    useEffect(() => {
        if (callLifecyclePhase !== "interviewing") return

        syncCountdown()
        const intervalId = window.setInterval(() => {
            syncCountdown()
            const timing = callTimingRef.current
            if (!timing) return

            const now = Date.now()
            if (now >= timing.targetEndAtMs) {
                void requestGracefulStop("timer")
                return
            }

            if (!finalInterruptTriggeredRef.current && now >= timing.finalInterruptAtMs) {
                void requestGracefulStop("timer")
                return
            }

            if (!finalQuestionTriggeredRef.current && now >= timing.lastQuestionAtMs) {
                beginLastQuestionPhase()
            }
        }, 250)

        return () => window.clearInterval(intervalId)
    }, [beginLastQuestionPhase, callLifecyclePhase, requestGracefulStop, syncCountdown])

    async function startCall() {
        if (startCallInFlightRef.current || callLifecyclePhaseRef.current !== "idle") return

        startCallInFlightRef.current = true
        setError("")
        setPostCallCandidateTranscript("")
        setPostCallTranscriptError("")
        setPostCallTranscriptStatus("idle")
        setTranscriptEntries([])
        updateCallLifecyclePhase("opening")
        setSecondsLeft(CALL_DURATION_SECONDS)
        updateClosingPhase("idle")
        resetClosingStateRefs(true)
        resetTranscriptTrackingRefs()
        callTimingRef.current = null
        recordedAudioChunksRef.current = []
        recordedAudioMimeTypeRef.current = ""
        clearClosingHardStopTimer()
        cancelHostPlayback()
        updateConnectionStatus("connecting")

        try {
            const startValidationError = !window.isSecureContext
                ? "Mikrofonzugriff funktioniert nur auf localhost oder HTTPS."
                : !navigator.mediaDevices?.getUserMedia
                    ? "Dieser Browser stellt keine getUserMedia-API bereit."
                    : !getSupportedRecordingMimeType()
                        ? "MediaRecorder ist fuer diese Aufnahme-Konfiguration nicht verfuegbar."
                        : ""

            if (startValidationError) {
                await stopCall()
                updateConnectionStatus("error")
                setError(startValidationError)
                return
            }

            const tokenResponse = await fetch("/api/gemini/live-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            })
            const tokenData = (await tokenResponse.json()) as Partial<LiveTokenResponse> & { error?: string }
            if (!tokenResponse.ok || !tokenData.token) {
                await stopCall()
                updateConnectionStatus("error")
                setError(tokenData.error || "Live-Token konnte nicht erstellt werden.")
                return
            }

            const audioContext = new AudioContext()
            audioContextRef.current = audioContext

            const ai = new GoogleGenAI({ apiKey: tokenData.token, httpOptions: { apiVersion: "v1alpha" } })
            const liveCallbacks: LiveCallbacks = {
                onopen: () => updateConnectionStatus("connected"),
                onmessage: (message: LiveServerMessage) => handleServerMessage(message),
                onerror: (event: ErrorEvent) => {
                    setError(event.message || "Fehler in der Live-Session.")
                    void requestGracefulStop("technicalError")
                },
                onclose: () => {
                    if (realtimeSessionDetachedRef.current) return
                    if (stopCallInFlightRef.current) return
                    void requestGracefulStop("technicalError")
                },
            }
            const session = await ai.live.connect({
                model: tokenData.model || LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: tokenData.voiceName || LIVE_VOICE } } },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: liveCallbacks,
            })

            sessionRef.current = session
            const microphoneStartResult = await startMicrophone(audioContext, session)
            if (!microphoneStartResult.ok) {
                await stopCall()
                updateConnectionStatus("error")
                setError(microphoneStartResult.error)
                return
            }
            updateCallLifecyclePhase("opening")

            const plannedQuestionContext = questionPlan.map((question, index) => `${index + 1}. ${question.text}`).join(" ")
            const openingQuestionPhrase = resolveOpeningQuestionPhrase(role)

            appendTranscript("system", `Interviewrahmen fuer ${role}: ${plannedQuestionContext}`)
            const greetingPlayed = await playHostPhrase(resolveGreetingPhrase(role))
            if (!greetingPlayed) {
                await stopCall()
                updateConnectionStatus("error")
                setError("Die feste Begruessung konnte nicht abgespielt werden.")
                return
            }

            const openingQuestionPlayed = await playHostPhrase(openingQuestionPhrase)
            if (!openingQuestionPlayed) {
                await stopCall()
                updateConnectionStatus("error")
                setError("Die feste erste Frage konnte nicht abgespielt werden.")
                return
            }

            callTimingRef.current = createCallTiming()
            syncCountdown()

            session.sendClientContent({
                turns: [
                    {
                        role: "model",
                        parts: [
                            {
                                text: openingQuestionPhrase.text,
                            },
                        ],
                    },
                ],
                turnComplete: false,
            })

            candidateAudioSuppressedRef.current = false
            updateCallLifecyclePhase("interviewing")
            updateClosingPhase("armed")
        } catch (startError) {
            await stopCall()
            updateConnectionStatus("error")
            setError(startError instanceof Error ? startError.message : "Voice-Call konnte nicht gestartet werden.")
        } finally {
            startCallInFlightRef.current = false
        }
    }

    // -- Render --

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                <header className="mb-4 rounded-[24px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Isolated Flow</p>
                        <h1 className="text-xl font-semibold">Live Voice + Video</h1>
                        <p className="mt-1 text-sm text-slate-600">Aktive Rolle: {role}</p>
                    </div>
                </header>

                <div className="space-y-4">
                    <FaceLandmarkPanel
                        ref={faceLandmarkPanelRef}
                        role={role}
                        compact
                        minimal
                        title="Face Cam"
                        description=""
                    />

                    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <section className="rounded-[24px] border bg-white p-4">
                            <p className="text-sm font-medium text-slate-500">{role}</p>
                            <h2 className="mt-1 text-lg font-semibold tracking-tight">Call</h2>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{connectionStatus}</span>
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{callLifecyclePhase}</span>
                                <span className={`rounded-full border px-3 py-1.5 ${secondsLeft <= LAST_QUESTION_LEAD_SECONDS ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700"}`}>
                                    {formatCountdown(secondsLeft)}
                                </span>
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{playbackActive ? "AI spricht" : "wartet"}</span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                                <span className={`rounded-full border px-3 py-1.5 ${microphoneSupported ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                    Mic
                                </span>
                                <span className={`rounded-full border px-3 py-1.5 ${recorderSupported ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                    Recorder
                                </span>
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{postCallTranscriptStatus}</span>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => void startCall()}
                                    disabled={callLifecyclePhase !== "idle" || connectionStatus === "connecting" || !microphoneSupported || !recorderSupported}
                                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {callLifecyclePhase === "opening" || connectionStatus === "connecting" ? "Verbinde..." : "Start"}
                                </button>
                                <button
                                    onClick={() => void requestGracefulStop("manual")}
                                    disabled={callLifecyclePhase === "idle" || callLifecyclePhase === "stopping"}
                                    className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                                >
                                    Stop
                                </button>
                            </div>

                            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
                            {postCallTranscriptError ? <p className="mt-2 text-sm text-red-600">{postCallTranscriptError}</p> : null}
                            {!microphoneSupported ? <p className="mt-4 text-xs text-slate-500">Nur mit HTTPS oder localhost und Mikrofonfreigabe.</p> : null}
                        </section>

                        <section className="rounded-[24px] border bg-white p-4">
                            <div className="flex items-center justify-between gap-3 border-b pb-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Aufnahme-Transkript</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full border bg-slate-50 px-3 py-1.5 text-xs text-slate-600">{postCallTranscriptStatus}</span>
                                    <button
                                        type="button"
                                        onClick={exportTranscriptAsTxt}
                                        disabled={transcriptQaPairs.length === 0}
                                        className="rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                                    >
                                        TXT Export
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 rounded-[20px] border bg-slate-50 p-4">
                                {postCallCandidateTranscript ? (
                                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{postCallCandidateTranscript}</p>
                                ) : postCallTranscriptStatus === "transcribing" ? (
                                    <p className="text-sm text-slate-600">Aufnahme wird gerade transkribiert.</p>
                                ) : postCallTranscriptStatus === "recording" ? (
                                    <p className="text-sm text-slate-600">Call laeuft. Das Transkript wird nach dem Beenden aus dem MediaRecorder erzeugt.</p>
                                ) : (
                                    <p className="text-sm text-slate-600">Nach dem Call erscheint hier nur das Aufnahme-Transkript des Kandidaten.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    )
}

function InterviewVoicePageContent() {
    const searchParams = useSearchParams()
    const role = searchParams.get("role") ?? "Backend Developer"
    return <VoiceInterview key={role} role={role} />
}

export default function InterviewVoicePage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
            <InterviewVoicePageContent />
        </Suspense>
    )
}
