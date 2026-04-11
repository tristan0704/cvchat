"use client"

import { useCallback, useRef, type MutableRefObject } from "react"
import { normalizeTranscriptText, type Speaker } from "@/lib/interview-transcript"
import {
    getFarewellPhrase,
    getLastQuestionPhrase,
    getTechnicalErrorFarewellPhrase,
    HOST_CLOSING_HARD_STOP_TIMEOUT_MS,
} from "@/lib/voice-interview/playback/host-phrases"
import {
    decideLastMinuteAction,
    FINAL_ANSWER_MAX_DURATION_MS,
    FINAL_ANSWER_START_TIMEOUT_MS,
    type CallTiming,
    type InterviewEndgameState,
    type InterviewTurnState,
} from "@/lib/voice-interview/session/endgame"
import type { CallLifecyclePhase, ConnectionStatus, StopReason } from "@/lib/voice-interview/core/types"

type StopCallRef = MutableRefObject<((options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) => Promise<void>) | null>

type UseVoiceEndgameArgs = {
    callTimingRef: MutableRefObject<CallTiming | null>
    stopCallInFlightRef: MutableRefObject<boolean>
    stopCallRef: StopCallRef
    turnStateRef: MutableRefObject<InterviewTurnState>
    endgameStateRef: MutableRefObject<InterviewEndgameState>
    finalAnswerStartedAtMsRef: MutableRefObject<number | null>
    candidateAudioSuppressedRef: MutableRefObject<boolean>
    candidateSpeechLiveRef: MutableRefObject<boolean>
    pendingCandidateTranscriptRef: MutableRefObject<string>
    pendingInterviewerTranscriptRef: MutableRefObject<string>
    updateTurnState: (nextState: InterviewTurnState) => void
    updateCallLifecyclePhase: (nextPhase: CallLifecyclePhase) => void
    closeRealtimeSession: (options?: { sendAudioStreamEnd?: boolean; markDetached?: boolean }) => void
    hasScheduledPlayback: () => boolean
    stopScheduledPlayback: () => void
    cancelHostPlayback: () => void
    flushPendingTranscript: (speaker: Extract<Speaker, "candidate" | "interviewer">, fallbackText?: string) => void
    appendTranscript: (speaker: Speaker, text: string, options?: { mergeWithPrevious?: boolean }) => void
    playHostPhrase: (phrase: ReturnType<typeof getFarewellPhrase>, options?: { appendTranscriptSpeaker?: Speaker }) => Promise<boolean>
}

export function useVoiceEndgame({
    callTimingRef,
    stopCallInFlightRef,
    stopCallRef,
    turnStateRef,
    endgameStateRef,
    finalAnswerStartedAtMsRef,
    candidateAudioSuppressedRef,
    candidateSpeechLiveRef,
    pendingCandidateTranscriptRef,
    pendingInterviewerTranscriptRef,
    updateTurnState,
    updateCallLifecyclePhase,
    closeRealtimeSession,
    hasScheduledPlayback,
    stopScheduledPlayback,
    cancelHostPlayback,
    flushPendingTranscript,
    appendTranscript,
    playHostPhrase,
}: UseVoiceEndgameArgs) {
    const realtimeSessionDetachedRef = useRef(false)
    const gracefulStopInFlightRef = useRef(false)
    const closingHardStopTimerRef = useRef<number | null>(null)
    const endgameAbsoluteStopTimerRef = useRef<number | null>(null)
    const finalAnswerStartTimerRef = useRef<number | null>(null)
    const finalAnswerMaxTimerRef = useRef<number | null>(null)
    const requestGracefulStopRef = useRef<((reason: StopReason) => Promise<void>) | null>(null)

    const updateEndgameState = useCallback((nextState: InterviewEndgameState) => {
        endgameStateRef.current = nextState
    }, [endgameStateRef])

    const clearClosingHardStopTimer = useCallback(() => {
        if (closingHardStopTimerRef.current === null || typeof window === "undefined") return
        window.clearTimeout(closingHardStopTimerRef.current)
        closingHardStopTimerRef.current = null
    }, [])

    const clearEndgameAbsoluteStopTimer = useCallback(() => {
        if (endgameAbsoluteStopTimerRef.current === null || typeof window === "undefined") return
        window.clearTimeout(endgameAbsoluteStopTimerRef.current)
        endgameAbsoluteStopTimerRef.current = null
    }, [])

    const clearFinalAnswerStartTimer = useCallback(() => {
        if (finalAnswerStartTimerRef.current === null || typeof window === "undefined") return
        window.clearTimeout(finalAnswerStartTimerRef.current)
        finalAnswerStartTimerRef.current = null
    }, [])

    const clearFinalAnswerMaxTimer = useCallback(() => {
        if (finalAnswerMaxTimerRef.current === null || typeof window === "undefined") return
        window.clearTimeout(finalAnswerMaxTimerRef.current)
        finalAnswerMaxTimerRef.current = null
    }, [])

    const clearEndgameTimers = useCallback(() => {
        clearEndgameAbsoluteStopTimer()
        clearFinalAnswerStartTimer()
        clearFinalAnswerMaxTimer()
    }, [clearEndgameAbsoluteStopTimer, clearFinalAnswerMaxTimer, clearFinalAnswerStartTimer])

    const resetClosingState = useCallback((candidateAudioSuppressed: boolean) => {
        candidateAudioSuppressedRef.current = candidateAudioSuppressed
        realtimeSessionDetachedRef.current = false
        gracefulStopInFlightRef.current = false
        finalAnswerStartedAtMsRef.current = null
        updateTurnState("between-questions")
        updateEndgameState("normal")
        clearEndgameTimers()
    }, [candidateAudioSuppressedRef, clearEndgameTimers, finalAnswerStartedAtMsRef, updateEndgameState, updateTurnState])

    const detachRealtimeSession = useCallback(() => {
        if (realtimeSessionDetachedRef.current) return

        realtimeSessionDetachedRef.current = true
        closeRealtimeSession({ sendAudioStreamEnd: true, markDetached: true })
        stopScheduledPlayback()
    }, [closeRealtimeSession, stopScheduledPlayback])

    const getEffectiveTurnState = useCallback((): InterviewTurnState => {
        if (turnStateRef.current === "interviewer-speaking") {
            return "interviewer-speaking"
        }

        if (hasScheduledPlayback() || !!normalizeTranscriptText(pendingInterviewerTranscriptRef.current)) {
            return "interviewer-speaking"
        }

        if (
            (turnStateRef.current === "awaiting-candidate-answer" || turnStateRef.current === "candidate-speaking") &&
            (candidateSpeechLiveRef.current || !!normalizeTranscriptText(pendingCandidateTranscriptRef.current))
        ) {
            return "candidate-speaking"
        }

        return turnStateRef.current
    }, [candidateSpeechLiveRef, hasScheduledPlayback, pendingCandidateTranscriptRef, pendingInterviewerTranscriptRef, turnStateRef])

    const scheduleEndgameAbsoluteStop = useCallback(() => {
        if (endgameAbsoluteStopTimerRef.current !== null || typeof window === "undefined") return

        const absoluteHardStopAtMs = callTimingRef.current?.absoluteHardStopAtMs
        if (!absoluteHardStopAtMs) return

        const delayMs = Math.max(0, absoluteHardStopAtMs - Date.now())
        endgameAbsoluteStopTimerRef.current = window.setTimeout(() => {
            appendTranscript("system", "Die Abschlussgrenze ist erreicht. Das Interview wird jetzt kontrolliert beendet.")
            void requestGracefulStopRef.current?.("timer")
        }, delayMs)
    }, [appendTranscript, callTimingRef])

    const armFinalAnswerMaxTimer = useCallback(() => {
        clearFinalAnswerMaxTimer()
        finalAnswerStartedAtMsRef.current = Date.now()

        if (typeof window === "undefined") return

        finalAnswerMaxTimerRef.current = window.setTimeout(() => {
            appendTranscript("system", "Die letzte Antwort erreicht das Zeitlimit. Das Interview wird jetzt beendet.")
            void requestGracefulStopRef.current?.("timer")
        }, FINAL_ANSWER_MAX_DURATION_MS)
    }, [appendTranscript, clearFinalAnswerMaxTimer, finalAnswerStartedAtMsRef])

    const armFinalAnswerWindow = useCallback(
        (options?: { candidateAlreadySpeaking?: boolean }) => {
            if (stopCallInFlightRef.current || gracefulStopInFlightRef.current) return

            clearFinalAnswerStartTimer()
            clearFinalAnswerMaxTimer()
            updateEndgameState("awaiting-final-answer")

            if (options?.candidateAlreadySpeaking) {
                updateTurnState("candidate-speaking")
                armFinalAnswerMaxTimer()
                return
            }

            finalAnswerStartedAtMsRef.current = null
            updateTurnState("awaiting-candidate-answer")
            if (typeof window === "undefined") return

            finalAnswerStartTimerRef.current = window.setTimeout(() => {
                appendTranscript("system", "Auf die letzte Frage kam keine Antwort mehr. Das Interview wird jetzt beendet.")
                void requestGracefulStopRef.current?.("timer")
            }, FINAL_ANSWER_START_TIMEOUT_MS)
        },
        [
            appendTranscript,
            armFinalAnswerMaxTimer,
            clearFinalAnswerMaxTimer,
            clearFinalAnswerStartTimer,
            finalAnswerStartedAtMsRef,
            stopCallInFlightRef,
            updateEndgameState,
            updateTurnState,
        ]
    )

    const detachForControlledEnding = useCallback(() => {
        candidateAudioSuppressedRef.current = true
        flushPendingTranscript("candidate")
        flushPendingTranscript("interviewer")
        detachRealtimeSession()
    }, [candidateAudioSuppressedRef, detachRealtimeSession, flushPendingTranscript])

    const startClosingQuestionPhase = useCallback(async () => {
        if (stopCallInFlightRef.current || gracefulStopInFlightRef.current) return
        if (endgameStateRef.current === "asking-closing-question" || endgameStateRef.current === "awaiting-final-answer") return

        detachForControlledEnding()
        updateEndgameState("asking-closing-question")
        appendTranscript("system", "Letzte Minute: Es ist noch Zeit fuer genau eine kurze Abschlussfrage.")
        updateTurnState("interviewer-speaking")

        const questionPlayed = await playHostPhrase(getLastQuestionPhrase())
        if (!questionPlayed) {
            void requestGracefulStopRef.current?.("timer")
            return
        }

        armFinalAnswerWindow({ candidateAlreadySpeaking: candidateSpeechLiveRef.current })
    }, [
        appendTranscript,
        armFinalAnswerWindow,
        candidateSpeechLiveRef,
        detachForControlledEnding,
        endgameStateRef,
        playHostPhrase,
        stopCallInFlightRef,
        updateEndgameState,
        updateTurnState,
    ])

    const beginLastMinuteLock = useCallback(() => {
        if (endgameStateRef.current !== "normal") return
        if (stopCallInFlightRef.current || gracefulStopInFlightRef.current) return

        scheduleEndgameAbsoluteStop()
        updateEndgameState("last-minute-locked")

        const effectiveTurnState = getEffectiveTurnState()
        const action = decideLastMinuteAction(effectiveTurnState)

        if (action === "ask-closing-question") {
            appendTranscript("system", "Letzte Minute: Es wird keine neue Standardfrage mehr gestartet.")
            void startClosingQuestionPhase()
            return
        }

        updateEndgameState("finishing-current-question")
        candidateAudioSuppressedRef.current = true

        if (effectiveTurnState === "interviewer-speaking") {
            appendTranscript("system", "Letzte Minute: Die laufende Frage wird noch fertig ausgesprochen und danach direkt beendet.")
            return
        }

        appendTranscript("system", "Letzte Minute: Die laufende Frage darf noch sauber beantwortet werden. Danach wird direkt beendet.")
        detachForControlledEnding()
        armFinalAnswerWindow({ candidateAlreadySpeaking: effectiveTurnState === "candidate-speaking" })
    }, [
        appendTranscript,
        armFinalAnswerWindow,
        detachForControlledEnding,
        getEffectiveTurnState,
        scheduleEndgameAbsoluteStop,
        startClosingQuestionPhase,
        candidateAudioSuppressedRef,
        endgameStateRef,
        stopCallInFlightRef,
        updateEndgameState,
    ])

    const requestGracefulStop = useCallback(
        async (reason: StopReason) => {
            if (gracefulStopInFlightRef.current || stopCallInFlightRef.current) return

            gracefulStopInFlightRef.current = true
            candidateAudioSuppressedRef.current = true
            updateEndgameState("finalizing")
            updateCallLifecyclePhase("closing")
            clearClosingHardStopTimer()
            clearEndgameTimers()
            cancelHostPlayback()
            stopScheduledPlayback()
            flushPendingTranscript("candidate")
            flushPendingTranscript("interviewer")
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
                await playHostPhrase(farewellPhrase, { appendTranscriptSpeaker: "system" })
            } finally {
                clearClosingHardStopTimer()
                await stopCallRef.current?.({ terminalStatus, closeSession: false })
                gracefulStopInFlightRef.current = false
            }
        },
        [
            appendTranscript,
            cancelHostPlayback,
            candidateAudioSuppressedRef,
            clearClosingHardStopTimer,
            clearEndgameTimers,
            detachRealtimeSession,
            flushPendingTranscript,
            playHostPhrase,
            stopCallInFlightRef,
            stopCallRef,
            stopScheduledPlayback,
            updateCallLifecyclePhase,
            updateEndgameState,
        ]
    )

    requestGracefulStopRef.current = requestGracefulStop

    return {
        candidateAudioSuppressedRef,
        realtimeSessionDetachedRef,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        clearFinalAnswerStartTimer,
        armFinalAnswerMaxTimer,
        armFinalAnswerWindow,
        beginLastMinuteLock,
        detachForControlledEnding,
        detachRealtimeSession,
        requestGracefulStop,
        requestGracefulStopRef,
        resetClosingState,
    }
}
