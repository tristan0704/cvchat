export type SpeechActivityTransition = "speech-started" | "speech-ended" | null

export type SpeechActivityConfig = {
    speakingThreshold: number
    silenceThreshold: number
    speechStartHoldMs: number
    speechEndHoldMs: number
}

export type SpeechActivityState = {
    isSpeaking: boolean
    aboveThresholdSinceMs: number | null
    belowThresholdSinceMs: number | null
    lastNonSilentAtMs: number | null
}

export const DEFAULT_SPEECH_ACTIVITY_CONFIG: SpeechActivityConfig = {
    speakingThreshold: 0.015,
    silenceThreshold: 0.008,
    speechStartHoldMs: 120,
    speechEndHoldMs: 2_500,
}

export function createSpeechActivityState(): SpeechActivityState {
    return {
        isSpeaking: false,
        aboveThresholdSinceMs: null,
        belowThresholdSinceMs: null,
        lastNonSilentAtMs: null,
    }
}

export function getChunkRms(samples: Float32Array): number {
    if (samples.length === 0) return 0

    let sum = 0
    for (let index = 0; index < samples.length; index += 1) {
        const sample = samples[index]
        sum += sample * sample
    }

    return Math.sqrt(sum / samples.length)
}

export function updateSpeechActivityState(
    state: SpeechActivityState,
    rms: number,
    nowMs = Date.now(),
    config: SpeechActivityConfig = DEFAULT_SPEECH_ACTIVITY_CONFIG
): SpeechActivityTransition {
    if (!state.isSpeaking) {
        if (rms >= config.speakingThreshold) {
            state.lastNonSilentAtMs = nowMs
            state.aboveThresholdSinceMs ??= nowMs
            if (nowMs - state.aboveThresholdSinceMs >= config.speechStartHoldMs) {
                state.isSpeaking = true
                state.aboveThresholdSinceMs = null
                state.belowThresholdSinceMs = null
                return "speech-started"
            }
        } else {
            state.aboveThresholdSinceMs = null
        }

        return null
    }

    if (rms <= config.silenceThreshold) {
        state.belowThresholdSinceMs ??= nowMs
        if (nowMs - state.belowThresholdSinceMs >= config.speechEndHoldMs) {
            state.isSpeaking = false
            state.aboveThresholdSinceMs = null
            state.belowThresholdSinceMs = null
            return "speech-ended"
        }
    } else {
        state.lastNonSilentAtMs = nowMs
        state.belowThresholdSinceMs = null
    }

    return null
}
