export const DEFAULT_CALL_DURATION_SECONDS = 300
export const LAST_MINUTE_THRESHOLD_SECONDS = 60
export const FINAL_ANSWER_START_TIMEOUT_MS = 8_000
export const FINAL_ANSWER_MAX_DURATION_MS = 45_000
export const ABSOLUTE_ENDGAME_GRACE_MS = 45_000

export type InterviewTurnState =
    | "between-questions"
    | "interviewer-speaking"
    | "awaiting-candidate-answer"
    | "candidate-speaking"

export type InterviewEndgameState =
    | "normal"
    | "last-minute-locked"
    | "finishing-current-question"
    | "asking-closing-question"
    | "awaiting-final-answer"
    | "finalizing"

export type CallTiming = {
    startedAtMs: number
    targetEndAtMs: number
    lastMinuteAtMs: number
    absoluteHardStopAtMs: number
}

export function createCallTiming(
    startedAtMs = Date.now(),
    callDurationSeconds = DEFAULT_CALL_DURATION_SECONDS
): CallTiming {
    const targetEndAtMs = startedAtMs + callDurationSeconds * 1_000

    return {
        startedAtMs,
        targetEndAtMs,
        lastMinuteAtMs: targetEndAtMs - LAST_MINUTE_THRESHOLD_SECONDS * 1_000,
        absoluteHardStopAtMs: targetEndAtMs + ABSOLUTE_ENDGAME_GRACE_MS,
    }
}

export function decideLastMinuteAction(turnState: InterviewTurnState) {
    return turnState === "between-questions" ? "ask-closing-question" : "finish-current-question"
}

