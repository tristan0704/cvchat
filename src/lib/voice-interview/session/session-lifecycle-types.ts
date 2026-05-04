import type { Dispatch, MutableRefObject, SetStateAction } from "react"
import type { Session } from "@google/genai"
import type { FaceLandmarkPanelHandle } from "@/lib/face-landmark-panel-handle"
import type {
    Speaker,
    VoiceFeedbackDraftPersistence,
} from "@/lib/interview-transcript"
import type { resolveGreetingPhrase } from "@/lib/voice-interview/playback/host-phrases"
import type { CallLifecyclePhase, ConnectionStatus, InterviewRecapStatus } from "@/lib/voice-interview/core/types"
import type { CallTiming, InterviewEndgameState, InterviewTurnState } from "@/lib/voice-interview/session/endgame"

export type TranscriptControls = {
    pendingCandidateTranscriptRef: MutableRefObject<string>
    pendingInterviewerTranscriptRef: MutableRefObject<string>
    appendTranscript: (speaker: Speaker, text: string, options?: { mergeWithPrevious?: boolean }) => void
    flushPendingTranscript: (speaker: Extract<Speaker, "candidate" | "interviewer">, fallbackText?: string) => void
    handleLiveTranscription: (speaker: Extract<Speaker, "candidate" | "interviewer">, text?: string, finished?: boolean) => void
    transcribeCandidateAudio: (audioBlob: Blob) => Promise<{ ok: true; value: { transcriptText: string; qaPairs: unknown[] } } | { ok: false; error: string }>
    persistDraft: (overrides?: VoiceFeedbackDraftPersistence) => void
    resetTranscriptState: () => void
    resetPendingTranscripts: () => void
    markPostCallTranscriptError: (message: string) => void
}

export type CaptureControls = {
    recorderSupported: boolean
    interviewRecapStatusRef: MutableRefObject<InterviewRecapStatus>
    clearInterviewRecap: () => void
    markInterviewRecapReady: (nextUrl: string) => void
    markInterviewRecapError: (message: string) => void
    resetRealtimeAudioPipeline: () => void
    startMicrophone: (audioContext: AudioContext, session: Session) => Promise<{ ok: true; value: void } | { ok: false; error: string }>
    stopCandidateRecording: () => Promise<Blob | null>
    stopInterviewRecapRecording: () => Promise<Blob | null>
    stopMicrophoneTracks: () => void
    cleanupCapture: () => void
}

export type PlaybackControls = {
    cancelHostPlayback: () => void
    playAudioChunk: (base64: string, mimeType?: string) => void
    playHostPhrase: (phrase: ReturnType<typeof resolveGreetingPhrase>, options?: { appendTranscriptSpeaker?: Speaker }) => Promise<boolean>
    stopScheduledPlayback: () => void
}

export type TimingControls = {
    finalizeActiveCandidateAnswer: (endedAtMs?: number) => void
    resetRealtimeTimingState: () => void
    resetTiming: () => void
}

export type EndgameControls = {
    realtimeSessionDetachedRef: MutableRefObject<boolean>
    clearClosingHardStopTimer: () => void
    clearEndgameTimers: () => void
    beginLastMinuteLock: () => void
    detachForControlledEnding: () => void
    armFinalAnswerWindow: (options?: { candidateAlreadySpeaking?: boolean }) => void
    requestGracefulStop: (reason: "timer" | "manual" | "goAway" | "technicalError") => Promise<void>
    resetClosingState: (candidateAudioSuppressed: boolean) => void
}

export type UseVoiceSessionLifecycleArgs = {
    role: string
    questionPlan: Array<{ text: string }>
    faceAnalysisEnabled: boolean
    faceLandmarkPanelRef: MutableRefObject<FaceLandmarkPanelHandle | null>
    sessionRef: MutableRefObject<Session | null>
    audioContextRef: MutableRefObject<AudioContext | null>
    turnStateRef: MutableRefObject<InterviewTurnState>
    endgameStateRef: MutableRefObject<InterviewEndgameState>
    candidateSpeechLiveRef: MutableRefObject<boolean>
    candidateAudioSuppressedRef: MutableRefObject<boolean>
    sessionShutdownRequestedRef: MutableRefObject<boolean>
    stopCallRef: MutableRefObject<((options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) => Promise<void>) | null>
    callTimingRef: MutableRefObject<CallTiming | null>
    callLifecyclePhase: CallLifecyclePhase
    callLifecyclePhaseRef: MutableRefObject<CallLifecyclePhase>
    startCallInFlightRef: MutableRefObject<boolean>
    stopCallInFlightRef: MutableRefObject<boolean>
    setError: Dispatch<SetStateAction<string>>
    setSecondsLeft: Dispatch<SetStateAction<number>>
    updateConnectionStatus: (nextStatus: ConnectionStatus) => void
    updateCallLifecyclePhase: (nextPhase: CallLifecyclePhase) => void
    updateTurnState: (nextState: InterviewTurnState) => void
    closeRealtimeSession: (options?: { sendAudioStreamEnd?: boolean; markDetached?: boolean }) => void
    transcript: TranscriptControls
    capture: CaptureControls
    playback: PlaybackControls
    timing: TimingControls
    endgame: EndgameControls
}
