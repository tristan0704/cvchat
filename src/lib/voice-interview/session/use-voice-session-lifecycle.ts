"use client"

import { useCallback, useEffect } from "react"
import {
    ActivityHandling,
    EndSensitivity,
    GoogleGenAI,
    LiveServerMessage,
    MediaResolution,
    Modality,
    StartSensitivity,
    TurnCoverage,
    type LiveCallbacks,
} from "@google/genai"
import { mergeModelTurnText } from "@/lib/live-interviewer-turns"
import { resolveGreetingPhrase, resolveOpeningQuestionPhrase } from "@/lib/voice-interview/playback/host-phrases"
import { createCallTiming } from "@/lib/voice-interview/session/endgame"
import {
    CALL_DURATION_SECONDS,
    LIVE_INPUT_PREFIX_PADDING_MS,
    LIVE_INPUT_SILENCE_DURATION_MS,
    LIVE_MODEL,
    LIVE_VOICE,
} from "@/lib/voice-interview/core/config"
import type { ConnectionStatus, LiveTokenResponse } from "@/lib/voice-interview/core/types"
import type { UseVoiceSessionLifecycleArgs } from "@/lib/voice-interview/session/session-lifecycle-types"

export function useVoiceSessionLifecycle({
    role,
    questionPlan,
    faceLandmarkPanelRef,
    sessionRef,
    audioContextRef,
    turnStateRef,
    endgameStateRef,
    candidateSpeechLiveRef,
    candidateAudioSuppressedRef,
    sessionShutdownRequestedRef,
    stopCallRef,
    callTimingRef,
    callLifecyclePhase,
    callLifecyclePhaseRef,
    startCallInFlightRef,
    stopCallInFlightRef,
    setError,
    setSecondsLeft,
    updateConnectionStatus,
    updateCallLifecyclePhase,
    updateTurnState,
    closeRealtimeSession,
    transcript,
    capture,
    playback,
    timing,
    endgame,
}: UseVoiceSessionLifecycleArgs) {
    const {
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        appendTranscript,
        flushPendingTranscript,
        handleLiveTranscription,
        transcribeCandidateAudio,
        persistDraft,
        resetTranscriptState,
        resetPendingTranscripts,
        markPostCallTranscriptError,
    } = transcript
    const {
        recorderSupported,
        interviewRecapStatusRef,
        clearInterviewRecap,
        markInterviewRecapReady,
        markInterviewRecapError,
        resetRealtimeAudioPipeline,
        startMicrophone,
        stopCandidateRecording,
        stopInterviewRecapRecording,
        stopMicrophoneTracks,
        cleanupCapture,
    } = capture
    const {
        cancelHostPlayback,
        playAudioChunk,
        playHostPhrase,
        stopScheduledPlayback,
    } = playback
    const {
        finalizeActiveCandidateAnswer,
        resetRealtimeTimingState,
        resetTiming,
    } = timing
    const {
        realtimeSessionDetachedRef,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        beginLastMinuteLock,
        detachForControlledEnding,
        armFinalAnswerWindow,
        requestGracefulStop,
        resetClosingState,
    } = endgame

    const syncCountdown = useCallback(() => {
        const targetEndAtMs = callTimingRef.current?.targetEndAtMs
        if (!targetEndAtMs) {
            setSecondsLeft(CALL_DURATION_SECONDS)
            return
        }

        const remainingMs = Math.max(0, targetEndAtMs - Date.now())
        setSecondsLeft(Math.ceil(remainingMs / 1_000))
    }, [callTimingRef, setSecondsLeft])

    const handleServerMessage = useCallback((message: LiveServerMessage) => {
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

        const modelTurnParts = message.serverContent?.modelTurn?.parts ?? []
        if (!message.serverContent?.outputTranscription?.text && modelTurnParts.length) {
            if (pendingCandidateTranscriptRef.current) {
                flushPendingTranscript("candidate")
            }

            pendingInterviewerTranscriptRef.current = mergeModelTurnText(pendingInterviewerTranscriptRef.current, modelTurnParts)
        }

        if (modelTurnParts.length) {
            updateTurnState("interviewer-speaking")
        }

        for (const part of modelTurnParts) {
            if (!part.inlineData?.data) continue
            if (callLifecyclePhaseRef.current === "closing" || callLifecyclePhaseRef.current === "stopping") continue

            playAudioChunk(part.inlineData.data, part.inlineData.mimeType)
        }

        if (message.serverContent?.turnComplete || message.serverContent?.waitingForInput) {
            flushPendingTranscript("interviewer")
            flushPendingTranscript("candidate")
            if (turnStateRef.current === "interviewer-speaking") {
                updateTurnState("awaiting-candidate-answer")
            } else if (endgameStateRef.current === "normal" && turnStateRef.current === "candidate-speaking" && !candidateSpeechLiveRef.current) {
                updateTurnState("between-questions")
            }
        }

        if (endgameStateRef.current === "finishing-current-question" && turnStateRef.current === "awaiting-candidate-answer" && !realtimeSessionDetachedRef.current) {
            detachForControlledEnding()
            armFinalAnswerWindow({ candidateAlreadySpeaking: candidateSpeechLiveRef.current })
        }

        if (message.goAway?.timeLeft) {
            setError(`Live-Session laeuft aus. Verbleibende Zeit: ${message.goAway.timeLeft}`)
            if (callLifecyclePhaseRef.current !== "closing" && callLifecyclePhaseRef.current !== "stopping") {
                void requestGracefulStop("goAway")
            }
        }
    }, [
        callLifecyclePhaseRef,
        candidateSpeechLiveRef,
        endgameStateRef,
        armFinalAnswerWindow,
        detachForControlledEnding,
        flushPendingTranscript,
        handleLiveTranscription,
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        playAudioChunk,
        realtimeSessionDetachedRef,
        requestGracefulStop,
        setError,
        stopScheduledPlayback,
        turnStateRef,
        updateTurnState,
    ])

    const stopCall = useCallback(async (options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) => {
        if (stopCallInFlightRef.current) return

        stopCallInFlightRef.current = true
        const { terminalStatus = "idle", closeSession = true } = options ?? {}
        updateCallLifecyclePhase("stopping")

        try {
            clearClosingHardStopTimer()
            cancelHostPlayback()
            flushPendingTranscript("candidate")
            flushPendingTranscript("interviewer")
            finalizeActiveCandidateAnswer()
            persistDraft()

            const recordedAudioBlob = await stopCandidateRecording().catch(() => null)
            const interviewRecapBlob = await stopInterviewRecapRecording().catch(() => null)

            if (closeSession) {
                closeRealtimeSession({ sendAudioStreamEnd: true })
            } else {
                sessionRef.current = null
            }

            resetRealtimeAudioPipeline()
            stopMicrophoneTracks()
            stopScheduledPlayback()

            if (audioContextRef.current) await audioContextRef.current.close().catch(() => undefined)
            audioContextRef.current = null

            updateConnectionStatus(terminalStatus)
            updateCallLifecyclePhase("idle")
            callTimingRef.current = null
            setSecondsLeft(CALL_DURATION_SECONDS)
            clearEndgameTimers()
            resetClosingState(false)
            resetPendingTranscripts()
            resetRealtimeTimingState()
            startCallInFlightRef.current = false

            const faceAnalysisPromise = faceLandmarkPanelRef.current?.stopAndAnalyze().catch(() => null)

            if (interviewRecapBlob && interviewRecapBlob.size > 0) {
                markInterviewRecapReady(URL.createObjectURL(interviewRecapBlob))
            } else if (interviewRecapStatusRef.current === "recording") {
                markInterviewRecapError("Das komplette Interview konnte nicht als Recap-Datei gespeichert werden.")
            }

            if (recordedAudioBlob && recordedAudioBlob.size > 0) {
                const transcriptionResult = await transcribeCandidateAudio(recordedAudioBlob)
                if (!transcriptionResult.ok) {
                    const message = transcriptionResult.error
                    markPostCallTranscriptError(message)
                    persistDraft({
                        postCallTranscriptStatus: "error",
                        postCallTranscriptError: message,
                    })
                }
            }

            await faceAnalysisPromise
        } finally {
            stopCallInFlightRef.current = false
        }
    }, [
        audioContextRef,
        callTimingRef,
        closeRealtimeSession,
        faceLandmarkPanelRef,
        sessionRef,
        setSecondsLeft,
        startCallInFlightRef,
        stopCallInFlightRef,
        cancelHostPlayback,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        finalizeActiveCandidateAnswer,
        flushPendingTranscript,
        interviewRecapStatusRef,
        markInterviewRecapError,
        markInterviewRecapReady,
        markPostCallTranscriptError,
        persistDraft,
        resetClosingState,
        resetPendingTranscripts,
        resetRealtimeAudioPipeline,
        resetRealtimeTimingState,
        stopCandidateRecording,
        stopInterviewRecapRecording,
        stopMicrophoneTracks,
        stopScheduledPlayback,
        transcribeCandidateAudio,
        updateCallLifecyclePhase,
        updateConnectionStatus,
    ])

    stopCallRef.current = stopCall

    useEffect(() => {
        return () => {
            clearClosingHardStopTimer()
            clearEndgameTimers()
            cancelHostPlayback()
            closeRealtimeSession({ sendAudioStreamEnd: true })
            cleanupCapture()
            stopScheduledPlayback()
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                void audioContextRef.current.close().catch(() => undefined)
            }
        }
    }, [audioContextRef, cancelHostPlayback, cleanupCapture, clearClosingHardStopTimer, clearEndgameTimers, closeRealtimeSession, stopScheduledPlayback])

    useEffect(() => {
        if (callLifecyclePhase !== "interviewing") return

        syncCountdown()
        const intervalId = window.setInterval(() => {
            syncCountdown()
            const timingWindow = callTimingRef.current
            if (!timingWindow) return

            const now = Date.now()
            if (now >= timingWindow.absoluteHardStopAtMs) {
                void requestGracefulStop("timer")
                return
            }

            if (endgameStateRef.current === "normal" && now >= timingWindow.lastMinuteAtMs) {
                beginLastMinuteLock()
            }
        }, 250)

        return () => window.clearInterval(intervalId)
    }, [beginLastMinuteLock, callLifecyclePhase, callTimingRef, endgameStateRef, requestGracefulStop, syncCountdown])

    const startCall = useCallback(async () => {
        if (startCallInFlightRef.current || callLifecyclePhaseRef.current !== "idle") return

        startCallInFlightRef.current = true
        clearInterviewRecap()
        setError("")
        resetTranscriptState()
        resetTiming()
        sessionShutdownRequestedRef.current = false
        updateCallLifecyclePhase("opening")
        setSecondsLeft(CALL_DURATION_SECONDS)
        resetClosingState(true)
        callTimingRef.current = null
        clearClosingHardStopTimer()
        clearEndgameTimers()
        cancelHostPlayback()
        updateConnectionStatus("connecting")

        try {
            const startValidationError = !window.isSecureContext
                ? "Mikrofonzugriff funktioniert nur auf localhost oder HTTPS."
                : !navigator.mediaDevices?.getUserMedia
                    ? "Dieser Browser stellt keine getUserMedia-API bereit."
                    : !recorderSupported
                        ? "MediaRecorder ist fuer diese Aufnahme-Konfiguration nicht verfuegbar."
                        : ""

            if (startValidationError) {
                await stopCall()
                updateConnectionStatus("error")
                setError(startValidationError)
                return
            }

            const audioContext = new AudioContext()
            audioContextRef.current = audioContext
            await audioContext.resume().catch(() => undefined)

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
                    realtimeInputConfig: {
                        activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
                        turnCoverage: TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY,
                        automaticActivityDetection: {
                            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
                            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
                            prefixPaddingMs: LIVE_INPUT_PREFIX_PADDING_MS,
                            silenceDurationMs: LIVE_INPUT_SILENCE_DURATION_MS,
                        },
                    },
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

            const plannedQuestionContext = questionPlan.map((question, index) => `${index + 1}. ${question.text}`).join(" ")
            const openingQuestionPhrase = resolveOpeningQuestionPhrase(role)

            appendTranscript("system", `Interviewrahmen fuer ${role}: ${plannedQuestionContext}`)
            const greetingPlayed = await playHostPhrase(resolveGreetingPhrase(role), { appendTranscriptSpeaker: "system" })
            if (!greetingPlayed) {
                appendTranscript("system", "Die feste Begruessung konnte lokal nicht abgespielt werden. Das Interview startet ohne Intro.")
                console.warn("Greeting playback failed. Continuing with opening question.")
            }

            updateTurnState("interviewer-speaking")
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
            updateTurnState("awaiting-candidate-answer")
        } catch (startError) {
            await stopCall()
            updateConnectionStatus("error")
            setError(startError instanceof Error ? startError.message : "Voice-Call konnte nicht gestartet werden.")
        } finally {
            startCallInFlightRef.current = false
        }
    }, [
        audioContextRef,
        callLifecyclePhaseRef,
        callTimingRef,
        candidateAudioSuppressedRef,
        appendTranscript,
        cancelHostPlayback,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        clearInterviewRecap,
        handleServerMessage,
        playHostPhrase,
        questionPlan,
        role,
        realtimeSessionDetachedRef,
        sessionRef,
        sessionShutdownRequestedRef,
        recorderSupported,
        requestGracefulStop,
        setError,
        setSecondsLeft,
        startCallInFlightRef,
        startMicrophone,
        stopCall,
        stopCallInFlightRef,
        syncCountdown,
        resetClosingState,
        resetTiming,
        resetTranscriptState,
        updateCallLifecyclePhase,
        updateConnectionStatus,
        updateTurnState,
    ])

    return {
        startCall,
        stopCall,
    }
}
