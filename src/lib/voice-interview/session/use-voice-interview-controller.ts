"use client"

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import type { Session } from "@google/genai"
import type { FaceLandmarkPanelHandle } from "@/components/interview/face-landmark-panel"
import { getInterviewQuestionPool } from "@/lib/interview"
import { useHostPlayback } from "@/lib/voice-interview/playback/use-host-playback"
import { CALL_DURATION_SECONDS } from "@/lib/voice-interview/core/config"
import type { CallLifecyclePhase, ConnectionStatus } from "@/lib/voice-interview/core/types"
import { type CallTiming, type InterviewEndgameState, type InterviewTurnState } from "@/lib/voice-interview/session/endgame"
import { useVoiceCapture } from "@/lib/voice-interview/session/use-voice-capture"
import { useVoiceEndgame } from "@/lib/voice-interview/session/use-voice-endgame"
import { useVoiceSessionLifecycle } from "@/lib/voice-interview/session/use-voice-session-lifecycle"
import { useVoiceTiming } from "@/lib/voice-interview/session/use-voice-timing"
import { useVoiceTranscript } from "@/lib/voice-interview/transcript/use-voice-transcript"

type StopCallRef = MutableRefObject<((options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) => Promise<void>) | null>

export function useVoiceInterviewController(role: string) {
    const questionPlan = getInterviewQuestionPool(role)
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle")
    const [error, setError] = useState("")
    const [callLifecyclePhase, setCallLifecyclePhase] = useState<CallLifecyclePhase>("idle")
    const [secondsLeft, setSecondsLeft] = useState(CALL_DURATION_SECONDS)

    const sessionRef = useRef<Session | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const turnStateRef = useRef<InterviewTurnState>("between-questions")
    const endgameStateRef = useRef<InterviewEndgameState>("normal")
    const pendingCandidateTranscriptRef = useRef("")
    const pendingInterviewerTranscriptRef = useRef("")
    const candidateSpeechLiveRef = useRef(false)
    const candidateAudioSuppressedRef = useRef(false)
    const finalAnswerStartedAtMsRef = useRef<number | null>(null)
    const sessionShutdownRequestedRef = useRef(false)
    const stopCallRef: StopCallRef = useRef(null)
    const connectionStatusRef = useRef<ConnectionStatus>("idle")
    const callLifecyclePhaseRef = useRef<CallLifecyclePhase>("idle")
    const startCallInFlightRef = useRef(false)
    const stopCallInFlightRef = useRef(false)
    const callTimingRef = useRef<CallTiming | null>(null)
    const faceLandmarkPanelRef = useRef<FaceLandmarkPanelHandle | null>(null)

    const timingHandleTurnStateChangeRef = useRef<(nextState: InterviewTurnState) => void>(() => undefined)
    const onCandidateAudioChunkRef = useRef<(input: Float32Array) => void>(() => undefined)

    const updateConnectionStatus = useCallback((nextStatus: ConnectionStatus) => {
        connectionStatusRef.current = nextStatus
        setConnectionStatus(nextStatus)
    }, [])

    const updateCallLifecyclePhase = useCallback((nextPhase: CallLifecyclePhase) => {
        callLifecyclePhaseRef.current = nextPhase
        setCallLifecyclePhase(nextPhase)
    }, [])

    const updateTurnState = useCallback((nextState: InterviewTurnState) => {
        timingHandleTurnStateChangeRef.current(nextState)
        turnStateRef.current = nextState
    }, [])

    const closeRealtimeSession = useCallback((options?: { sendAudioStreamEnd?: boolean; markDetached?: boolean }) => {
        const activeSession = sessionRef.current
        sessionRef.current = null

        if (!activeSession || sessionShutdownRequestedRef.current) return
        sessionShutdownRequestedRef.current = true

        const websocket = (activeSession.conn as { ws?: WebSocket }).ws
        const canSendAudioStreamEnd = options?.sendAudioStreamEnd !== false && websocket?.readyState === WebSocket.OPEN

        if (canSendAudioStreamEnd) {
            try {
                activeSession.sendRealtimeInput({ audioStreamEnd: true })
            } catch {}
        }

        try {
            activeSession.close()
        } catch {}
    }, [])

    const transcript = useVoiceTranscript({
        role,
        turnStateRef,
        endgameStateRef,
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        updateTurnState,
    })

    const capture = useVoiceCapture({
        connectionStatusRef,
        candidateAudioSuppressedRef,
        onCandidateAudioChunk: (input) => onCandidateAudioChunkRef.current(input),
        onPostCallRecordingStarted: transcript.markPostCallRecordingStarted,
    })

    const playback = useHostPlayback({
        audioContextRef,
        recapMixDestinationRef: capture.recapMixDestinationRef,
        appendTranscript: transcript.appendTranscript,
        markInterviewRecapCaptureGap: capture.markInterviewRecapCaptureGap,
    })

    const endgame = useVoiceEndgame({
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
        hasScheduledPlayback: playback.hasScheduledPlayback,
        stopScheduledPlayback: playback.stopScheduledPlayback,
        cancelHostPlayback: playback.cancelHostPlayback,
        flushPendingTranscript: transcript.flushPendingTranscript,
        appendTranscript: transcript.appendTranscript,
        playHostPhrase: playback.playHostPhrase,
    })

    const timing = useVoiceTiming({
        callLifecyclePhaseRef,
        turnStateRef,
        endgameStateRef,
        finalAnswerStartedAtMsRef,
        candidateSpeechLiveRef,
        candidateTranscriptWordSource: transcript.candidateTranscriptWordSource,
        updateTurnState,
        clearFinalAnswerStartTimer: endgame.clearFinalAnswerStartTimer,
        armFinalAnswerMaxTimer: endgame.armFinalAnswerMaxTimer,
        requestGracefulStop: endgame.requestGracefulStop,
    })

    useEffect(() => {
        timingHandleTurnStateChangeRef.current = timing.handleTurnStateChange
        onCandidateAudioChunkRef.current = timing.handleCandidateAudioChunk
    }, [timing.handleCandidateAudioChunk, timing.handleTurnStateChange])

    const { startCall } = useVoiceSessionLifecycle({
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
        transcript: {
            pendingCandidateTranscriptRef,
            pendingInterviewerTranscriptRef,
            appendTranscript: transcript.appendTranscript,
            flushPendingTranscript: transcript.flushPendingTranscript,
            handleLiveTranscription: transcript.handleLiveTranscription,
            transcribeCandidateAudio: transcript.transcribeCandidateAudio,
            persistDraft: transcript.persistDraft,
            resetTranscriptState: transcript.reset,
            resetPendingTranscripts: transcript.resetPendingTranscripts,
            markPostCallTranscriptError: transcript.markPostCallTranscriptError,
        },
        capture: {
            recorderSupported: capture.recorderSupported,
            interviewRecapStatusRef: capture.interviewRecapStatusRef,
            clearInterviewRecap: capture.clearInterviewRecap,
            markInterviewRecapReady: capture.markInterviewRecapReady,
            markInterviewRecapError: capture.markInterviewRecapError,
            resetRealtimeAudioPipeline: capture.resetRealtimeAudioPipeline,
            startMicrophone: capture.startMicrophone,
            stopCandidateRecording: capture.stopCandidateRecording,
            stopInterviewRecapRecording: capture.stopInterviewRecapRecording,
            stopMicrophoneTracks: capture.stopMicrophoneTracks,
            cleanupCapture: capture.cleanupCapture,
        },
        playback: {
            cancelHostPlayback: playback.cancelHostPlayback,
            playAudioChunk: playback.playAudioChunk,
            playHostPhrase: playback.playHostPhrase,
            stopScheduledPlayback: playback.stopScheduledPlayback,
        },
        timing: {
            finalizeActiveCandidateAnswer: timing.finalizeActiveCandidateAnswer,
            resetRealtimeTimingState: timing.resetRealtimeTimingState,
            resetTiming: timing.resetTiming,
        },
        endgame: {
            realtimeSessionDetachedRef: endgame.realtimeSessionDetachedRef,
            clearClosingHardStopTimer: endgame.clearClosingHardStopTimer,
            clearEndgameTimers: endgame.clearEndgameTimers,
            beginLastMinuteLock: endgame.beginLastMinuteLock,
            detachForControlledEnding: endgame.detachForControlledEnding,
            armFinalAnswerWindow: endgame.armFinalAnswerWindow,
            requestGracefulStop: endgame.requestGracefulStop,
            resetClosingState: endgame.resetClosingState,
        },
    })

    return {
        faceLandmarkPanelRef,
        connectionStatus,
        error,
        microphoneSupported: capture.microphoneSupported,
        recorderSupported: capture.recorderSupported,
        interviewRecapUrl: capture.interviewRecapUrl,
        interviewRecapStatus: capture.interviewRecapStatus,
        interviewRecapError: capture.interviewRecapError,
        interviewRecapCaptureNote: capture.interviewRecapCaptureNote,
        callLifecyclePhase,
        secondsLeft,
        playbackActive: playback.playbackActive,
        postCallCandidateTranscript: transcript.postCallCandidateTranscript,
        postCallTranscriptStatus: transcript.postCallTranscriptStatus,
        postCallTranscriptError: transcript.postCallTranscriptError,
        canExportTranscript: transcript.canExportTranscript,
        interviewTimingMetrics: timing.interviewTimingMetrics,
        hasTimingMetrics: timing.hasTimingMetrics,
        startCall,
        requestGracefulStop: endgame.requestGracefulStop,
        exportTranscriptAsTxt: transcript.exportTranscriptAsTxt,
    }
}
