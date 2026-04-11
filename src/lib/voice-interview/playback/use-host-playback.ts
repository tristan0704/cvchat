"use client"

import { useCallback, useRef, useState, type MutableRefObject } from "react"
import { type Speaker } from "@/lib/interview-transcript"
import { decodePcm16, parseSampleRate } from "@/lib/audio"
import { HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS, type HostVoicePhrase } from "@/lib/voice-interview/playback/host-phrases"

type UseHostPlaybackArgs = {
    audioContextRef: MutableRefObject<AudioContext | null>
    recapMixDestinationRef: MutableRefObject<MediaStreamAudioDestinationNode | null>
    appendTranscript: (speaker: Speaker, text: string, options?: { mergeWithPrevious?: boolean }) => void
    markInterviewRecapCaptureGap: () => void
}

export function useHostPlayback({
    audioContextRef,
    recapMixDestinationRef,
    appendTranscript,
    markInterviewRecapCaptureGap,
}: UseHostPlaybackArgs) {
    const [playbackActive, setPlaybackActive] = useState(false)

    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([])
    const nextPlaybackTimeRef = useRef(0)
    const localSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const fixedPhraseSourceRef = useRef<AudioBufferSourceNode | null>(null)
    const hostPlaybackSequenceRef = useRef(0)

    const cancelLocalSpeech = useCallback(() => {
        localSpeechUtteranceRef.current = null
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return
        window.speechSynthesis.cancel()
        setPlaybackActive(false)
    }, [])

    const cancelFixedPhraseAudio = useCallback(() => {
        const activeSource = fixedPhraseSourceRef.current
        fixedPhraseSourceRef.current = null

        if (!activeSource) {
            setPlaybackActive(false)
            return
        }

        try {
            activeSource.onended = null
            activeSource.stop()
            activeSource.disconnect()
        } catch {}

        setPlaybackActive(false)
    }, [])

    const cancelHostPlayback = useCallback(() => {
        hostPlaybackSequenceRef.current += 1
        cancelFixedPhraseAudio()
        cancelLocalSpeech()
    }, [cancelFixedPhraseAudio, cancelLocalSpeech])

    const connectPlaybackSource = useCallback(
        (source: AudioNode, audioContext: AudioContext) => {
            source.connect(audioContext.destination)
            const recapMixDestination = recapMixDestinationRef.current
            if (recapMixDestination) {
                source.connect(recapMixDestination)
            }
        },
        [recapMixDestinationRef]
    )

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

                    markInterviewRecapCaptureGap()
                    setPlaybackActive(true)
                }
                utterance.onend = () => finish(hostPlaybackSequenceRef.current === playbackSequence)
                utterance.onerror = () => finish(false)

                localSpeechUtteranceRef.current = utterance
                window.speechSynthesis.speak(utterance)
            }),
        [markInterviewRecapCaptureGap]
    )

    const playFixedPhraseAsset = useCallback(
        (assetPath: string, playbackSequence: number) =>
            new Promise<boolean>((resolve) => {
                const audioContext = audioContextRef.current
                if (typeof window === "undefined" || !audioContext) {
                    resolve(false)
                    return
                }

                let settled = false
                let source: AudioBufferSourceNode | null = null
                const startTimeoutId = window.setTimeout(() => finish(false), HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS)

                const cleanup = () => {
                    window.clearTimeout(startTimeoutId)
                    if (source) {
                        source.onended = null
                        if (fixedPhraseSourceRef.current === source) {
                            fixedPhraseSourceRef.current = null
                        }

                        try {
                            source.disconnect()
                        } catch {}
                    }
                }

                const finish = (result: boolean) => {
                    if (settled) return
                    settled = true
                    cleanup()
                    setPlaybackActive(false)
                    resolve(result)
                }

                void (async () => {
                    try {
                        await audioContext.resume().catch(() => undefined)
                        const response = await fetch(assetPath, { cache: "force-cache" })
                        if (!response.ok || settled || hostPlaybackSequenceRef.current !== playbackSequence) {
                            finish(false)
                            return
                        }

                        const assetBytes = await response.arrayBuffer()
                        if (settled || hostPlaybackSequenceRef.current !== playbackSequence) {
                            finish(false)
                            return
                        }

                        const decodedBuffer = await audioContext.decodeAudioData(assetBytes.slice(0))
                        if (settled || hostPlaybackSequenceRef.current !== playbackSequence) {
                            finish(false)
                            return
                        }

                        source = audioContext.createBufferSource()
                        source.buffer = decodedBuffer
                        connectPlaybackSource(source, audioContext)
                        source.onended = () => finish(hostPlaybackSequenceRef.current === playbackSequence)
                        fixedPhraseSourceRef.current = source
                        setPlaybackActive(true)
                        window.clearTimeout(startTimeoutId)
                        source.start(audioContext.currentTime + 0.01)
                    } catch (error) {
                        console.warn("Host asset playback failed:", assetPath, error)
                        finish(false)
                    }
                })()
            }),
        [audioContextRef, connectPlaybackSource]
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

    const stopScheduledPlayback = useCallback(() => {
        for (const source of scheduledSourcesRef.current) {
            try {
                source.stop()
            } catch {}
        }

        scheduledSourcesRef.current = []
        setPlaybackActive(false)
        nextPlaybackTimeRef.current = audioContextRef.current?.currentTime ?? 0
    }, [audioContextRef])

    const playAudioChunk = useCallback(
        (base64: string, mimeType?: string) => {
            const audioContext = audioContextRef.current
            if (!audioContext) return

            const sampleRate = parseSampleRate(mimeType)
            const samples = decodePcm16(base64)
            const audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate)
            audioBuffer.copyToChannel(samples, 0)

            const source = audioContext.createBufferSource()
            source.buffer = audioBuffer
            connectPlaybackSource(source, audioContext)

            const startTime = Math.max(audioContext.currentTime + 0.05, nextPlaybackTimeRef.current)
            source.start(startTime)
            setPlaybackActive(true)
            nextPlaybackTimeRef.current = startTime + audioBuffer.duration
            scheduledSourcesRef.current.push(source)

            source.onended = () => {
                scheduledSourcesRef.current = scheduledSourcesRef.current.filter((item) => item !== source)
                if (scheduledSourcesRef.current.length === 0) setPlaybackActive(false)
            }
        },
        [audioContextRef, connectPlaybackSource]
    )

    const hasScheduledPlayback = useCallback(() => scheduledSourcesRef.current.length > 0, [])

    return {
        playbackActive,
        cancelHostPlayback,
        playAudioChunk,
        playHostPhrase,
        stopScheduledPlayback,
        hasScheduledPlayback,
    }
}
