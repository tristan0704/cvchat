export type ConnectionStatus = "idle" | "connecting" | "connected" | "error"

export type CallLifecyclePhase = "idle" | "opening" | "interviewing" | "closing" | "stopping"

export type InterviewRecapStatus = "idle" | "recording" | "ready" | "error"

export type StopReason = "timer" | "manual" | "goAway" | "technicalError"

export type LiveTokenResponse = {
    token: string
    model: string
    voiceName: string
}

export type AsyncResult<T> = { ok: true; value: T } | { ok: false; error: string }

export type InterviewTimingMetrics = {
    answerCount: number
    totalCandidateSpeechMs: number
    averageAnswerDurationMs: number
    longestAnswerDurationMs: number
    shortestAnswerDurationMs: number
    averageResponseLatencyMs: number
    longestResponseLatencyMs: number
    candidateWordsPerMinute: number | null
}
