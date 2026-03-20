"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { GoogleGenAI, LiveServerMessage, MediaResolution, Modality, Session } from "@google/genai"
import { FaceLandmarkPanel, type FaceLandmarkPanelHandle } from "@/components/interview/face-landmark-panel"
import { formatCountdown, getInterviewQuestionPool } from "@/lib/interview"

// Gemini Live model used for the realtime voice interviewer.
const LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"
// Synthetic voice name for the interviewer.
const LIVE_VOICE = "Zephyr"
// Fallback playback sample rate when the stream does not specify one.
const OUTPUT_SAMPLE_RATE_FALLBACK = 24_000
// Microphone audio is downsampled to this rate before being sent upstream.
const INPUT_SAMPLE_RATE = 16_000
// Total target call length in seconds.
const CALL_DURATION_SECONDS = 300
// How many seconds before call end the interviewer asks the final question.
const LAST_QUESTION_LEAD_SECONDS = 40
// How many seconds before call end the interviewer cuts off and closes verbally.
const FINAL_INTERRUPT_LEAD_SECONDS = 15
// Final silent window before the call is force-stopped.
const SILENT_TAIL_SECONDS = 5
// Session storage key for the post-call transcript/feedback handoff.
const VOICE_FEEDBACK_DRAFT_STORAGE_KEY = "voiceInterviewFeedbackDraft"
// Deterministic local fallback for the final question to avoid LLM drift near call end.
const LOCAL_FINAL_QUESTION = "Zum Abschluss noch eine letzte kurze Frage: Warum bist du fuer diese Rolle jetzt konkret die richtige Besetzung?"
// Deterministic local closing line right before the silent tail.
const LOCAL_FINAL_CLOSING = "Ich unterbreche kurz, die Zeit ist vorbei. Vielen Dank fuer das Gespraech."

type ConnectionStatus = "idle" | "connecting" | "connected" | "error"
type ClosingPhase = "idle" | "armed" | "last-question" | "finalizing" | "silent"
type ClosingMode = "lastQuestion" | "finalInterrupt" | "goAway"
type Speaker = "candidate" | "interviewer" | "system"
type TranscriptEntry = { id: string; speaker: Speaker; text: string }
type TranscriptQaPair = { question: string; answer: string }
type LiveTokenResponse = { token: string; model: string; voiceName: string }
type PostCallTranscriptStatus = "idle" | "recording" | "transcribing" | "ready" | "error"
type CallTiming = {
    startedAtMs: number
    targetEndAtMs: number
    lastQuestionAtMs: number
    finalInterruptAtMs: number
    silentTailAtMs: number
}

function normalizeTranscriptText(text: string) {
    return text.replace(/\s+/g, " ").replace(/\s+([,.!?;:])/g, "$1").trim()
}

function parseSampleRate(mimeType?: string) {
    const match = mimeType?.match(/rate=(\d+)/i)
    return match ? Number(match[1]) : OUTPUT_SAMPLE_RATE_FALLBACK
}

function base64ToUint8Array(base64: string) {
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes
}

function encodeBase64(bytes: Uint8Array) {
    let binary = ""
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
    return window.btoa(binary)
}

function downsampleBuffer(input: Float32Array, inputRate: number, outputRate: number) {
    if (inputRate === outputRate) return input
    const ratio = inputRate / outputRate
    const newLength = Math.round(input.length / ratio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetInput = 0

    while (offsetResult < result.length) {
        const nextOffsetInput = Math.round((offsetResult + 1) * ratio)
        let accumulated = 0
        let count = 0

        for (let index = offsetInput; index < nextOffsetInput && index < input.length; index += 1) {
            accumulated += input[index]
            count += 1
        }

        result[offsetResult] = count > 0 ? accumulated / count : 0
        offsetResult += 1
        offsetInput = nextOffsetInput
    }

    return result
}

function floatTo16BitPcm(input: Float32Array) {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)

    for (let index = 0; index < input.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, input[index]))
        view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }

    return new Uint8Array(buffer)
}

function decodePcm16(base64: string) {
    const pcmBytes = base64ToUint8Array(base64)
    const sampleCount = Math.floor(pcmBytes.byteLength / 2)
    const samples = new Float32Array(sampleCount)
    const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength)

    for (let index = 0; index < sampleCount; index += 1) samples[index] = view.getInt16(index * 2, true) / 0x8000

    return samples
}

function getSupportedRecordingMimeType() {
    if (typeof MediaRecorder === "undefined") return ""

    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
    return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ""
}

function createCallTiming(startedAtMs = Date.now()): CallTiming {
    return {
        startedAtMs,
        targetEndAtMs: startedAtMs + CALL_DURATION_SECONDS * 1_000,
        lastQuestionAtMs: startedAtMs + (CALL_DURATION_SECONDS - LAST_QUESTION_LEAD_SECONDS) * 1_000,
        finalInterruptAtMs: startedAtMs + (CALL_DURATION_SECONDS - FINAL_INTERRUPT_LEAD_SECONDS) * 1_000,
        silentTailAtMs: startedAtMs + (CALL_DURATION_SECONDS - SILENT_TAIL_SECONDS) * 1_000,
    }
}

function buildTranscriptQaPairs(entries: TranscriptEntry[]) {
    const pairs: TranscriptQaPair[] = []
    let activeQuestion = ""
    let activeAnswer = ""

    for (const entry of entries) {
        if (entry.speaker === "system") continue

        if (entry.speaker === "interviewer") {
            if (activeQuestion) {
                pairs.push({
                    question: activeQuestion,
                    answer: activeAnswer || "(keine Antwort erfasst)",
                })
            }

            activeQuestion = entry.text
            activeAnswer = ""
            continue
        }

        if (!activeQuestion) continue
        activeAnswer = activeAnswer ? `${activeAnswer} ${entry.text}` : entry.text
    }

    if (activeQuestion) {
        pairs.push({
            question: activeQuestion,
            answer: activeAnswer || "(keine Antwort erfasst)",
        })
    }

    return pairs
}

function buildTranscriptQaExport(role: string, entries: TranscriptEntry[]) {
    const pairs = buildTranscriptQaPairs(entries)
    if (!pairs.length) return ""

    return [
        `Rolle: ${role}`,
        `Exportiert: ${new Date().toISOString()}`,
        "",
        ...pairs.flatMap((pair, index) => [
            `${index + 1}.`,
            `Frage: ${pair.question}`,
            `Antwort: ${pair.answer}`,
            "",
        ]),
    ].join("\n")
}

function persistVoiceFeedbackDraft(args: {
    role: string
    transcriptEntries: TranscriptEntry[]
    postCallCandidateTranscript: string
    postCallTranscriptStatus: PostCallTranscriptStatus
    postCallTranscriptError: string
}) {
    if (typeof window === "undefined") return

    window.sessionStorage.setItem(
        VOICE_FEEDBACK_DRAFT_STORAGE_KEY,
        JSON.stringify({
            role: args.role,
            mode: "voice",
            transcriptEntries: args.transcriptEntries,
            postCallCandidateTranscript: args.postCallCandidateTranscript,
            postCallTranscriptStatus: args.postCallTranscriptStatus,
            postCallTranscriptError: args.postCallTranscriptError,
            updatedAt: new Date().toISOString(),
        })
    )
}

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
    const [callStarted, setCallStarted] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(CALL_DURATION_SECONDS)
    const transcriptQaPairs = buildTranscriptQaPairs(transcriptEntries)

    const sessionRef = useRef<Session | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const microphoneStreamRef = useRef<MediaStream | null>(null)
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null)
    const silentGainRef = useRef<GainNode | null>(null)
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([])
    const nextPlaybackTimeRef = useRef(0)
    const transcriptCounterRef = useRef(0)
    const closingRequestedRef = useRef(false)
    const stopCallRef = useRef<(() => Promise<void>) | null>(null)
    const connectionStatusRef = useRef<ConnectionStatus>("idle")
    const closingPhaseRef = useRef<ClosingPhase>("idle")
    const startCallInFlightRef = useRef(false)
    const stopCallInFlightRef = useRef(false)
    const callTimingRef = useRef<CallTiming | null>(null)
    const transcriptEntriesRef = useRef<TranscriptEntry[]>([])
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedAudioChunksRef = useRef<Blob[]>([])
    const recordedAudioMimeTypeRef = useRef("")
    const postCallCandidateTranscriptRef = useRef("")
    const postCallTranscriptStatusRef = useRef<PostCallTranscriptStatus>("idle")
    const postCallTranscriptErrorRef = useRef("")
    const candidateAudioSuppressedRef = useRef(false)
    const localSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const pendingCandidateTranscriptRef = useRef("")
    const pendingInterviewerTranscriptRef = useRef("")
    const lastCandidateTranscriptRef = useRef("")
    const lastInterviewerTranscriptRef = useRef("")
    const realtimeSessionDetachedRef = useRef(false)
    const finalQuestionTriggeredRef = useRef(false)
    const finalInterruptTriggeredRef = useRef(false)
    const silentTailTriggeredRef = useRef(false)
    const faceLandmarkPanelRef = useRef<FaceLandmarkPanelHandle | null>(null)

    useEffect(() => {
        connectionStatusRef.current = connectionStatus
    }, [connectionStatus])

    useEffect(() => {
        transcriptEntriesRef.current = transcriptEntries
    }, [transcriptEntries])

    useEffect(() => {
        postCallCandidateTranscriptRef.current = postCallCandidateTranscript
    }, [postCallCandidateTranscript])

    useEffect(() => {
        postCallTranscriptStatusRef.current = postCallTranscriptStatus
    }, [postCallTranscriptStatus])

    useEffect(() => {
        postCallTranscriptErrorRef.current = postCallTranscriptError
    }, [postCallTranscriptError])

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

    function updateConnectionStatus(nextStatus: ConnectionStatus) {
        connectionStatusRef.current = nextStatus
        setConnectionStatus(nextStatus)
    }

    const updateClosingPhase = useCallback((nextPhase: ClosingPhase) => {
        closingPhaseRef.current = nextPhase
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

    const cancelLocalSpeech = useCallback(() => {
        localSpeechUtteranceRef.current = null
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return
        window.speechSynthesis.cancel()
        setPlaybackActive(false)
    }, [])

    const speakLocally = useCallback(
        (text: string) => {
            cancelLocalSpeech()
            appendTranscript("interviewer", text, { mergeWithPrevious: false })

            if (typeof window === "undefined" || !("speechSynthesis" in window)) return

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = "de-DE"
            utterance.rate = 1
            utterance.pitch = 1
            utterance.onstart = () => {
                if (localSpeechUtteranceRef.current === utterance) setPlaybackActive(true)
            }
            utterance.onend = () => {
                if (localSpeechUtteranceRef.current !== utterance) return
                localSpeechUtteranceRef.current = null
                setPlaybackActive(false)
            }
            utterance.onerror = () => {
                if (localSpeechUtteranceRef.current !== utterance) return
                localSpeechUtteranceRef.current = null
                setPlaybackActive(false)
            }

            localSpeechUtteranceRef.current = utterance
            window.speechSynthesis.speak(utterance)
        },
        [appendTranscript, cancelLocalSpeech]
    )

    const detachRealtimeSession = useCallback(() => {
        if (realtimeSessionDetachedRef.current) return

        realtimeSessionDetachedRef.current = true

        try {
            sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true })
        } catch {}

        sessionRef.current?.close()
        sessionRef.current = null

        processorNodeRef.current?.disconnect()
        sourceNodeRef.current?.disconnect()
        silentGainRef.current?.disconnect()
        processorNodeRef.current = null
        sourceNodeRef.current = null
        silentGainRef.current = null

        stopScheduledPlayback()
    }, [])

    const beginSilentTail = useCallback(() => {
        if (closingPhaseRef.current === "silent") return

        candidateAudioSuppressedRef.current = true
        cancelLocalSpeech()
        stopScheduledPlayback()
        updateClosingPhase("silent")
        appendTranscript("system", "Die letzten 5 Sekunden bleiben still. Danach wird der Call beendet.")
    }, [appendTranscript, cancelLocalSpeech, updateClosingPhase])

    const beginClosingSequence = useCallback(
        (mode: ClosingMode) => {
            if (mode === "lastQuestion") {
                if (finalQuestionTriggeredRef.current || closingPhaseRef.current === "silent") return
                finalQuestionTriggeredRef.current = true
                closingRequestedRef.current = true
                detachRealtimeSession()
                updateClosingPhase("last-question")
                appendTranscript("system", "Noch rund 40 Sekunden. Der Interviewer stellt jetzt genau eine letzte Frage.")
                speakLocally(LOCAL_FINAL_QUESTION)
                return
            }

            if (finalInterruptTriggeredRef.current || closingPhaseRef.current === "silent") return
            finalInterruptTriggeredRef.current = true
            closingRequestedRef.current = true
            candidateAudioSuppressedRef.current = true
            detachRealtimeSession()
            cancelLocalSpeech()
            stopScheduledPlayback()
            updateClosingPhase("finalizing")

            const systemMessage =
                mode === "goAway"
                      ? "Die Live-Session laeuft aus. Der Interviewer beendet den Call jetzt sauber."
                      : "Noch 15 Sekunden. Der Interviewer unterbricht jetzt, beendet den Call und bedankt sich knapp."

            appendTranscript("system", systemMessage)
            speakLocally(LOCAL_FINAL_CLOSING)
        },
        [appendTranscript, cancelLocalSpeech, detachRealtimeSession, speakLocally, updateClosingPhase]
    )

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
            if (closingPhaseRef.current === "silent") continue

            playAudioChunk(part.inlineData.data, part.inlineData.mimeType)
        }

        if (message.serverContent?.turnComplete && pendingInterviewerTranscriptRef.current) {
            flushFinishedTranscript("interviewer", pendingInterviewerTranscriptRef.current)
            pendingInterviewerTranscriptRef.current = ""
        }

        if (message.goAway?.timeLeft) {
            setError(`Live-Session laeuft aus. Verbleibende Zeit: ${message.goAway.timeLeft}`)
            if (closingPhaseRef.current !== "finalizing") beginClosingSequence("goAway")
        }
    }

    function sendRealtimeAudioChunk(session: Session, input: Float32Array, sampleRate: number) {
        if (connectionStatusRef.current === "error" || connectionStatusRef.current === "idle") return
        if (candidateAudioSuppressedRef.current) return

        const downsampled = downsampleBuffer(input, sampleRate, INPUT_SAMPLE_RATE)
        const pcmBytes = floatTo16BitPcm(downsampled)

        try {
            session.sendRealtimeInput({ audio: { data: encodeBase64(pcmBytes), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` } })
        } catch {}
    }

    async function startMicrophone(audioContext: AudioContext, session: Session) {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Mikrofonzugriff ist in diesem Browser oder Kontext nicht verfuegbar. Nutze localhost oder HTTPS und pruefe die Browser-Berechtigung.")
        }

        const recordingMimeType = getSupportedRecordingMimeType()
        if (!recordingMimeType || typeof MediaRecorder === "undefined") {
            throw new Error("MediaRecorder wird in diesem Browser nicht ausreichend unterstuetzt.")
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })

        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        const silentGain = audioContext.createGain()
        silentGain.gain.value = 0

        processor.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0)
            sendRealtimeAudioChunk(session, input, audioContext.sampleRate)
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
    }

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

    async function transcribeCandidateAudio(audioBlob: Blob) {
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

        const response = await fetch("/api/simulate/interview-transcript", {
            method: "POST",
            body: formData,
        })
        const data = (await response.json()) as { transcriptText?: string; error?: string }

        if (!response.ok || !data.transcriptText) {
            throw new Error(data.error || "Post-Call-Transkription fehlgeschlagen.")
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

        return data.transcriptText
    }

    async function stopCall(options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) {
        if (stopCallInFlightRef.current) return

        stopCallInFlightRef.current = true
        const { terminalStatus = "idle", closeSession = true } = options ?? {}

        try {
            persistVoiceFeedbackDraft({
                role,
                transcriptEntries: transcriptEntriesRef.current,
                postCallCandidateTranscript: postCallCandidateTranscriptRef.current,
                postCallTranscriptStatus: postCallTranscriptStatusRef.current,
                postCallTranscriptError: postCallTranscriptErrorRef.current,
            })

            const recordedAudioBlob = await stopCandidateRecording().catch(() => null)

            if (closeSession) {
                cancelLocalSpeech()
                try {
                    sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true })
                } catch {}

                sessionRef.current?.close()
            }

            sessionRef.current = null
            processorNodeRef.current?.disconnect()
            sourceNodeRef.current?.disconnect()
            silentGainRef.current?.disconnect()
            processorNodeRef.current = null
            sourceNodeRef.current = null
            silentGainRef.current = null

            for (const track of microphoneStreamRef.current?.getTracks() ?? []) track.stop()
            microphoneStreamRef.current = null

            stopScheduledPlayback()
            if (audioContextRef.current) await audioContextRef.current.close().catch(() => undefined)
            audioContextRef.current = null
            nextPlaybackTimeRef.current = 0
            updateConnectionStatus(terminalStatus)
            setCallStarted(false)
            callTimingRef.current = null
            setSecondsLeft(CALL_DURATION_SECONDS)
            updateClosingPhase("idle")
            closingRequestedRef.current = false
            candidateAudioSuppressedRef.current = false
            pendingCandidateTranscriptRef.current = ""
            pendingInterviewerTranscriptRef.current = ""
            lastCandidateTranscriptRef.current = ""
            lastInterviewerTranscriptRef.current = ""
            realtimeSessionDetachedRef.current = false
            finalQuestionTriggeredRef.current = false
            finalInterruptTriggeredRef.current = false
            silentTailTriggeredRef.current = false
            startCallInFlightRef.current = false
            const faceAnalysisPromise = faceLandmarkPanelRef.current?.stopAndAnalyze().catch(() => null)

            if (recordedAudioBlob && recordedAudioBlob.size > 0) {
                try {
                    await transcribeCandidateAudio(recordedAudioBlob)
                } catch (transcriptionError) {
                    const message = transcriptionError instanceof Error ? transcriptionError.message : "Post-Call-Transkription fehlgeschlagen."
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
            cancelLocalSpeech()
            try {
                sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true })
            } catch {}
            sessionRef.current?.close()
            processorNodeRef.current?.disconnect()
            sourceNodeRef.current?.disconnect()
            silentGainRef.current?.disconnect()
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
    }, [cancelLocalSpeech])

    useEffect(() => {
        if (!callStarted || connectionStatus !== "connected") return

        syncCountdown()
        const intervalId = window.setInterval(() => {
            syncCountdown()
            const timing = callTimingRef.current
            if (!timing) return

            const now = Date.now()
            if (now >= timing.targetEndAtMs) {
                void stopCallRef.current?.()
                return
            }

            if (!silentTailTriggeredRef.current && now >= timing.silentTailAtMs) {
                silentTailTriggeredRef.current = true
                beginSilentTail()
                return
            }

            if (!finalInterruptTriggeredRef.current && now >= timing.finalInterruptAtMs) {
                beginClosingSequence("finalInterrupt")
                return
            }

            if (!finalQuestionTriggeredRef.current && now >= timing.lastQuestionAtMs) {
                beginClosingSequence("lastQuestion")
            }
        }, 250)

        return () => window.clearInterval(intervalId)
    }, [beginClosingSequence, beginSilentTail, callStarted, connectionStatus, syncCountdown])

    async function startCall() {
        if (startCallInFlightRef.current || connectionStatusRef.current === "connected") return

        startCallInFlightRef.current = true
        setError("")
        setPostCallCandidateTranscript("")
        setPostCallTranscriptError("")
        setPostCallTranscriptStatus("idle")
        setTranscriptEntries([])
        setCallStarted(false)
        setSecondsLeft(CALL_DURATION_SECONDS)
        updateClosingPhase("idle")
        closingRequestedRef.current = false
        candidateAudioSuppressedRef.current = false
        pendingCandidateTranscriptRef.current = ""
        pendingInterviewerTranscriptRef.current = ""
        lastCandidateTranscriptRef.current = ""
        lastInterviewerTranscriptRef.current = ""
        realtimeSessionDetachedRef.current = false
        finalQuestionTriggeredRef.current = false
        finalInterruptTriggeredRef.current = false
        silentTailTriggeredRef.current = false
        callTimingRef.current = null
        recordedAudioChunksRef.current = []
        recordedAudioMimeTypeRef.current = ""
        updateConnectionStatus("connecting")

        try {
            if (!window.isSecureContext) throw new Error("Mikrofonzugriff funktioniert nur auf localhost oder HTTPS.")
            if (!navigator.mediaDevices?.getUserMedia) throw new Error("Dieser Browser stellt keine getUserMedia-API bereit.")
            if (!getSupportedRecordingMimeType()) throw new Error("MediaRecorder ist fuer diese Aufnahme-Konfiguration nicht verfuegbar.")

            const tokenResponse = await fetch("/api/gemini/live-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            })
            const tokenData = (await tokenResponse.json()) as Partial<LiveTokenResponse> & { error?: string }
            if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || "Live-Token konnte nicht erstellt werden.")

            const audioContext = new AudioContext()
            audioContextRef.current = audioContext

            const ai = new GoogleGenAI({ apiKey: tokenData.token, httpOptions: { apiVersion: "v1alpha" } })
            const session = await ai.live.connect({
                model: tokenData.model || LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: tokenData.voiceName || LIVE_VOICE } } },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => updateConnectionStatus("connected"),
                    onmessage: (message: LiveServerMessage) => handleServerMessage(message),
                    onerror: (event: ErrorEvent) => {
                        setError(event.message || "Fehler in der Live-Session.")
                        void stopCall({ terminalStatus: "error" })
                    },
                    onclose: () => {
                        if (realtimeSessionDetachedRef.current) return
                        if (stopCallInFlightRef.current) return
                        void stopCall({ terminalStatus: connectionStatusRef.current === "error" ? "error" : "idle", closeSession: false })
                    },
                },
            })

            sessionRef.current = session
            await startMicrophone(audioContext, session)

            const firstCoreQuestion = questionPlan[0]?.text || `Warum passt du aus deiner Sicht gut zur Rolle ${role}?`
            const plannedQuestionContext = questionPlan.map((question, index) => `${index + 1}. ${question.text}`).join(" ")

            appendTranscript("system", `Interviewrahmen fuer ${role}: ${plannedQuestionContext}`)

            callTimingRef.current = createCallTiming()
            syncCountdown()

            session.sendClientContent({
                turns: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `Starte jetzt das Interview fuer die Rolle ${role}. Begruesse mich kurz in einem Satz und stelle dann sofort diese erste Kernfrage: "${firstCoreQuestion}".`,
                            },
                        ],
                    },
                ],
                turnComplete: true,
            })

            setCallStarted(true)
            updateClosingPhase("armed")
        } catch (startError) {
            await stopCall()
            updateConnectionStatus("error")
            setError(startError instanceof Error ? startError.message : "Voice-Call konnte nicht gestartet werden.")
        } finally {
            startCallInFlightRef.current = false
        }
    }

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
                                    disabled={connectionStatus === "connecting" || connectionStatus === "connected" || !microphoneSupported || !recorderSupported}
                                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {connectionStatus === "connecting" ? "Verbinde..." : "Start"}
                                </button>
                                <button
                                    onClick={() => void stopCall()}
                                    disabled={connectionStatus !== "connected" && connectionStatus !== "error"}
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
