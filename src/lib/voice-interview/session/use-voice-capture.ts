"use client"

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import type { Session } from "@google/genai"
import {
    downsampleBuffer,
    encodeBase64,
    floatTo16BitPcm,
    getSupportedRecordingMimeType,
    INPUT_SAMPLE_RATE,
} from "@/lib/audio"
import { AUDIO_INPUT_WORKLET_PATH } from "@/lib/voice-interview/core/config"
import type { AsyncResult, ConnectionStatus, InterviewRecapStatus } from "@/lib/voice-interview/core/types"

type UseVoiceCaptureArgs = {
    connectionStatusRef: MutableRefObject<ConnectionStatus>
    candidateAudioSuppressedRef: MutableRefObject<boolean>
    onCandidateAudioChunk: (input: Float32Array) => void
    onPostCallRecordingStarted: () => void
}

export function useVoiceCapture({
    connectionStatusRef,
    candidateAudioSuppressedRef,
    onCandidateAudioChunk,
    onPostCallRecordingStarted,
}: UseVoiceCaptureArgs) {
    const [interviewRecapUrl, setInterviewRecapUrl] = useState("")
    const [interviewRecapStatus, setInterviewRecapStatus] = useState<InterviewRecapStatus>("idle")
    const [interviewRecapError, setInterviewRecapError] = useState("")
    const [interviewRecapCaptureNote, setInterviewRecapCaptureNote] = useState("")

    const microphoneSupported = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
    const recorderSupported = microphoneSupported && !!getSupportedRecordingMimeType()

    const microphoneStreamRef = useRef<MediaStream | null>(null)
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const processorNodeRef = useRef<AudioWorkletNode | null>(null)
    const silentGainRef = useRef<GainNode | null>(null)
    const recapMixDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
    const interviewRecapStatusRef = useRef<InterviewRecapStatus>("idle")
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedAudioChunksRef = useRef<Blob[]>([])
    const recordedAudioMimeTypeRef = useRef("")
    const recapRecorderRef = useRef<MediaRecorder | null>(null)
    const recapRecordedAudioChunksRef = useRef<Blob[]>([])
    const recapRecordedAudioMimeTypeRef = useRef("")
    const recapObjectUrlRef = useRef("")
    const recapHasSpeechSynthesisGapRef = useRef(false)

    useEffect(() => {
        interviewRecapStatusRef.current = interviewRecapStatus
    }, [interviewRecapStatus])

    const replaceInterviewRecapUrl = useCallback((nextUrl: string) => {
        if (typeof window !== "undefined" && recapObjectUrlRef.current) {
            URL.revokeObjectURL(recapObjectUrlRef.current)
        }

        recapObjectUrlRef.current = nextUrl
        setInterviewRecapUrl(nextUrl)
    }, [])

    const clearInterviewRecap = useCallback(() => {
        replaceInterviewRecapUrl("")
        recapHasSpeechSynthesisGapRef.current = false
        recapRecordedAudioChunksRef.current = []
        recapRecordedAudioMimeTypeRef.current = ""
        interviewRecapStatusRef.current = "idle"
        setInterviewRecapStatus("idle")
        setInterviewRecapError("")
        setInterviewRecapCaptureNote("")
    }, [replaceInterviewRecapUrl])

    const markInterviewRecapCaptureGap = useCallback(() => {
        if (recapHasSpeechSynthesisGapRef.current) return

        recapHasSpeechSynthesisGapRef.current = true
        setInterviewRecapCaptureNote("Falls der Browser-TTS-Fallback lief, fehlen einzelne feste Host-Phrasen im Recap.")
    }, [])

    const markInterviewRecapReady = useCallback((nextUrl: string) => {
        replaceInterviewRecapUrl(nextUrl)
        interviewRecapStatusRef.current = "ready"
        setInterviewRecapStatus("ready")
        setInterviewRecapError("")
    }, [replaceInterviewRecapUrl])

    const markInterviewRecapError = useCallback((message: string) => {
        interviewRecapStatusRef.current = "error"
        setInterviewRecapStatus("error")
        setInterviewRecapError(message)
    }, [])

    const resetRealtimeAudioPipeline = useCallback(() => {
        processorNodeRef.current?.port.close()
        processorNodeRef.current?.disconnect()
        sourceNodeRef.current?.disconnect()
        silentGainRef.current?.disconnect()
        processorNodeRef.current = null
        sourceNodeRef.current = null
        silentGainRef.current = null
        recapMixDestinationRef.current = null
    }, [])

    const sendRealtimeAudioChunk = useCallback((session: Session, input: Float32Array, sampleRate: number) => {
        if (connectionStatusRef.current === "error" || connectionStatusRef.current === "idle") return
        if (candidateAudioSuppressedRef.current) return

        const downsampled = downsampleBuffer(input, sampleRate, INPUT_SAMPLE_RATE)
        const pcmBytes = floatTo16BitPcm(downsampled)

        try {
            session.sendRealtimeInput({ audio: { data: encodeBase64(pcmBytes), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` } })
        } catch {}
    }, [candidateAudioSuppressedRef, connectionStatusRef])

    const startInterviewRecapRecording = useCallback((audioContext: AudioContext, recordingMimeType: string): AsyncResult<void> => {
        try {
            const recapMixDestination = audioContext.createMediaStreamDestination()
            recapMixDestinationRef.current = recapMixDestination
            recapRecordedAudioChunksRef.current = []
            recapRecordedAudioMimeTypeRef.current = recordingMimeType

            const recapRecorder = new MediaRecorder(recapMixDestination.stream, { mimeType: recordingMimeType })
            recapRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) recapRecordedAudioChunksRef.current.push(event.data)
            }
            recapRecorder.start(1_000)

            recapRecorderRef.current = recapRecorder
            interviewRecapStatusRef.current = "recording"
            setInterviewRecapStatus("recording")
            setInterviewRecapError("")
            return { ok: true, value: undefined }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Der Interview-Recap konnte nicht gestartet werden."
            recapMixDestinationRef.current = null
            recapRecorderRef.current = null
            interviewRecapStatusRef.current = "error"
            setInterviewRecapStatus("error")
            setInterviewRecapError(message)
            return { ok: false, error: message }
        }
    }, [])

    const startMicrophone = useCallback(async (audioContext: AudioContext, session: Session): Promise<AsyncResult<void>> => {
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
            const recapRecordingResult = startInterviewRecapRecording(audioContext, recordingMimeType)

            processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
                if (!(event.data instanceof Float32Array)) return

                onCandidateAudioChunk(event.data)
                sendRealtimeAudioChunk(session, event.data, audioContext.sampleRate)
            }

            source.connect(processor)
            if (recapMixDestinationRef.current) {
                source.connect(recapMixDestinationRef.current)
            }
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
            onPostCallRecordingStarted()
            if (!recapRecordingResult.ok) {
                console.warn("Interview recap recording failed:", recapRecordingResult.error)
            }
            return { ok: true, value: undefined }
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : "Der Mikrofon- oder AudioWorklet-Start ist fehlgeschlagen.",
            }
        }
    }, [onCandidateAudioChunk, onPostCallRecordingStarted, sendRealtimeAudioChunk, startInterviewRecapRecording])

    const stopCandidateRecording = useCallback(async () => {
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
    }, [])

    const stopInterviewRecapRecording = useCallback(async () => {
        const recorder = recapRecorderRef.current
        recapRecorderRef.current = null

        if (!recorder) return null
        if (recorder.state === "inactive") {
            if (recapRecordedAudioChunksRef.current.length === 0) return null
            return new Blob(recapRecordedAudioChunksRef.current, { type: recapRecordedAudioMimeTypeRef.current || "audio/webm" })
        }

        return await new Promise<Blob | null>((resolve) => {
            recorder.onstop = () => {
                if (recapRecordedAudioChunksRef.current.length === 0) {
                    resolve(null)
                    return
                }

                resolve(new Blob(recapRecordedAudioChunksRef.current, { type: recapRecordedAudioMimeTypeRef.current || recorder.mimeType || "audio/webm" }))
            }
            recorder.stop()
        })
    }, [])

    const stopMicrophoneTracks = useCallback(() => {
        for (const track of microphoneStreamRef.current?.getTracks() ?? []) track.stop()
        microphoneStreamRef.current = null
    }, [])

    const cleanupCapture = useCallback(() => {
        const recapRecorder = recapRecorderRef.current
        recapRecorderRef.current = null
        if (recapRecorder?.state === "recording") {
            try {
                recapRecorder.stop()
            } catch {}
        }

        resetRealtimeAudioPipeline()
        stopMicrophoneTracks()
        if (typeof window !== "undefined" && recapObjectUrlRef.current) {
            URL.revokeObjectURL(recapObjectUrlRef.current)
            recapObjectUrlRef.current = ""
        }
    }, [resetRealtimeAudioPipeline, stopMicrophoneTracks])

    return {
        microphoneSupported,
        recorderSupported,
        interviewRecapUrl,
        interviewRecapStatus,
        interviewRecapError,
        interviewRecapCaptureNote,
        interviewRecapStatusRef,
        recapMixDestinationRef,
        clearInterviewRecap,
        replaceInterviewRecapUrl,
        markInterviewRecapCaptureGap,
        markInterviewRecapReady,
        markInterviewRecapError,
        resetRealtimeAudioPipeline,
        startMicrophone,
        stopCandidateRecording,
        stopInterviewRecapRecording,
        stopMicrophoneTracks,
        cleanupCapture,
    }
}
