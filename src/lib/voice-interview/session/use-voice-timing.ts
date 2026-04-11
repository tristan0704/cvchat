"use client"

import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react"
import { createSpeechActivityState, getChunkRms, updateSpeechActivityState } from "@/lib/speech-activity"
import { buildInterviewTimingMetrics } from "@/lib/voice-interview/core/timing-metrics"
import type { CallLifecyclePhase, StopReason } from "@/lib/voice-interview/core/types"
import type { InterviewEndgameState, InterviewTurnState } from "@/lib/voice-interview/session/endgame"

type UseVoiceTimingArgs = {
    callLifecyclePhaseRef: MutableRefObject<CallLifecyclePhase>
    turnStateRef: MutableRefObject<InterviewTurnState>
    endgameStateRef: MutableRefObject<InterviewEndgameState>
    finalAnswerStartedAtMsRef: MutableRefObject<number | null>
    candidateSpeechLiveRef: MutableRefObject<boolean>
    candidateTranscriptWordSource: string
    updateTurnState: (nextState: InterviewTurnState) => void
    clearFinalAnswerStartTimer: () => void
    armFinalAnswerMaxTimer: () => void
    requestGracefulStop: (reason: StopReason) => Promise<void>
}

export function useVoiceTiming({
    callLifecyclePhaseRef,
    turnStateRef,
    endgameStateRef,
    finalAnswerStartedAtMsRef,
    candidateSpeechLiveRef,
    candidateTranscriptWordSource,
    updateTurnState,
    clearFinalAnswerStartTimer,
    armFinalAnswerMaxTimer,
    requestGracefulStop,
}: UseVoiceTimingArgs) {
    const [candidateAnswerDurationsMs, setCandidateAnswerDurationsMs] = useState<number[]>([])
    const [candidateResponseLatenciesMs, setCandidateResponseLatenciesMs] = useState<number[]>([])

    const activeCandidateAnswerStartedAtMsRef = useRef<number | null>(null)
    const pendingCandidateResponseStartedAtMsRef = useRef<number | null>(null)
    const candidateSpeechActivityRef = useRef(createSpeechActivityState())

    const recordCandidateAnswerDuration = useCallback((durationMs: number) => {
        if (durationMs <= 0) return
        setCandidateAnswerDurationsMs((previousDurations) => [...previousDurations, durationMs])
    }, [])

    const recordCandidateResponseLatency = useCallback((latencyMs: number) => {
        if (latencyMs < 0) return
        setCandidateResponseLatenciesMs((previousLatencies) => [...previousLatencies, latencyMs])
    }, [])

    const finalizeActiveCandidateAnswer = useCallback(
        (endedAtMs = Date.now()) => {
            const startedAtMs = activeCandidateAnswerStartedAtMsRef.current
            activeCandidateAnswerStartedAtMsRef.current = null
            if (startedAtMs === null) return

            recordCandidateAnswerDuration(Math.max(0, endedAtMs - startedAtMs))
        },
        [recordCandidateAnswerDuration]
    )

    const handleTurnStateChange = useCallback((nextState: InterviewTurnState) => {
        if (nextState === "awaiting-candidate-answer" && turnStateRef.current !== "awaiting-candidate-answer") {
            pendingCandidateResponseStartedAtMsRef.current = Date.now()
        }

        if (nextState === "interviewer-speaking") {
            pendingCandidateResponseStartedAtMsRef.current = null
        }
    }, [turnStateRef])

    const resetRealtimeTimingState = useCallback(() => {
        activeCandidateAnswerStartedAtMsRef.current = null
        pendingCandidateResponseStartedAtMsRef.current = null
        candidateSpeechActivityRef.current = createSpeechActivityState()
        candidateSpeechLiveRef.current = false
    }, [candidateSpeechLiveRef])

    const resetTiming = useCallback(() => {
        setCandidateAnswerDurationsMs([])
        setCandidateResponseLatenciesMs([])
        resetRealtimeTimingState()
    }, [resetRealtimeTimingState])

    const handleCandidateSpeechStarted = useCallback(() => {
        if (callLifecyclePhaseRef.current !== "interviewing") return
        if (turnStateRef.current === "interviewer-speaking") return

        const startedAtMs = Date.now()

        candidateSpeechLiveRef.current = true
        if (activeCandidateAnswerStartedAtMsRef.current === null) {
            activeCandidateAnswerStartedAtMsRef.current = startedAtMs
        }

        if (pendingCandidateResponseStartedAtMsRef.current !== null) {
            recordCandidateResponseLatency(Math.max(0, startedAtMs - pendingCandidateResponseStartedAtMsRef.current))
            pendingCandidateResponseStartedAtMsRef.current = null
        }

        if (endgameStateRef.current === "awaiting-final-answer") {
            clearFinalAnswerStartTimer()
            updateTurnState("candidate-speaking")
            if (finalAnswerStartedAtMsRef.current === null) {
                armFinalAnswerMaxTimer()
            }
            return
        }

        if (endgameStateRef.current === "normal" && turnStateRef.current === "awaiting-candidate-answer") {
            updateTurnState("candidate-speaking")
        }
    }, [
        armFinalAnswerMaxTimer,
        callLifecyclePhaseRef,
        candidateSpeechLiveRef,
        clearFinalAnswerStartTimer,
        endgameStateRef,
        finalAnswerStartedAtMsRef,
        recordCandidateResponseLatency,
        turnStateRef,
        updateTurnState,
    ])

    const handleCandidateSpeechEnded = useCallback(() => {
        candidateSpeechLiveRef.current = false
        finalizeActiveCandidateAnswer(candidateSpeechActivityRef.current.lastNonSilentAtMs ?? Date.now())

        if (callLifecyclePhaseRef.current !== "interviewing") return
        if (turnStateRef.current === "interviewer-speaking") return

        if (endgameStateRef.current === "awaiting-final-answer" && turnStateRef.current === "candidate-speaking") {
            updateTurnState("between-questions")
            void requestGracefulStop("timer")
            return
        }

        if (endgameStateRef.current === "normal" && turnStateRef.current === "candidate-speaking") {
            updateTurnState("between-questions")
        }
    }, [
        callLifecyclePhaseRef,
        candidateSpeechLiveRef,
        endgameStateRef,
        finalizeActiveCandidateAnswer,
        requestGracefulStop,
        turnStateRef,
        updateTurnState,
    ])

    const handleCandidateAudioChunk = useCallback((input: Float32Array) => {
        if (callLifecyclePhaseRef.current === "interviewing" && turnStateRef.current !== "interviewer-speaking") {
            const transition = updateSpeechActivityState(candidateSpeechActivityRef.current, getChunkRms(input), Date.now())
            if (transition === "speech-started") {
                handleCandidateSpeechStarted()
            }

            if (transition === "speech-ended") {
                handleCandidateSpeechEnded()
            }
            return
        }

        candidateSpeechActivityRef.current = createSpeechActivityState()
        candidateSpeechLiveRef.current = false
    }, [callLifecyclePhaseRef, candidateSpeechLiveRef, handleCandidateSpeechEnded, handleCandidateSpeechStarted, turnStateRef])

    const interviewTimingMetrics = useMemo(
        () =>
            buildInterviewTimingMetrics({
                candidateAnswerDurationsMs,
                candidateResponseLatenciesMs,
                candidateTranscriptWordSource,
            }),
        [candidateAnswerDurationsMs, candidateResponseLatenciesMs, candidateTranscriptWordSource]
    )

    return {
        candidateSpeechLiveRef,
        interviewTimingMetrics,
        hasTimingMetrics: interviewTimingMetrics.answerCount > 0 || candidateResponseLatenciesMs.length > 0,
        handleTurnStateChange,
        handleCandidateAudioChunk,
        finalizeActiveCandidateAnswer,
        resetRealtimeTimingState,
        resetTiming,
    }
}
