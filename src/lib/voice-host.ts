/**
 * Shared helpers for host-controlled voice phrases.
 *
 * The host, not the live interview model, owns deterministic fixed phrases
 * such as the greeting, the last-question prompt, and the farewell. This
 * keeps start and stop behavior predictable even if the realtime model is
 * delayed, interrupted, or already closing.
 */

import voiceHostPhraseManifest from "@/config/voice-host-phrases.json"

type GreetingPhraseConfig = {
    id: string
    roleLabel: string
    matchers: string[]
    text: string
    assetPath: string
}

type FixedPhraseConfig = {
    id: string
    text: string
    assetPath: string
}

type VoiceHostPhraseManifest = {
    voiceName: string
    assetLoadFallbackTimeoutMs: number
    closingHardStopTimeoutMs: number
    greetings: GreetingPhraseConfig[]
    genericGreeting: FixedPhraseConfig
    firstQuestions: GreetingPhraseConfig[]
    genericFirstQuestion: FixedPhraseConfig
    lastQuestion: FixedPhraseConfig
    farewell: FixedPhraseConfig
    technicalErrorFarewell: FixedPhraseConfig
}

export type HostVoicePhrase = FixedPhraseConfig

const manifest = voiceHostPhraseManifest as VoiceHostPhraseManifest

export const HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS = manifest.assetLoadFallbackTimeoutMs
export const HOST_CLOSING_HARD_STOP_TIMEOUT_MS = manifest.closingHardStopTimeoutMs

function resolveRolePhrase(role: string, roleSpecificPhrases: GreetingPhraseConfig[], fallbackPhrase: FixedPhraseConfig): HostVoicePhrase {
    const normalizedRole = role.trim().toLowerCase()
    const matchedPhrase = roleSpecificPhrases.find((phrase) =>
        phrase.matchers.some((matcher) => normalizedRole.includes(matcher))
    )

    if (matchedPhrase) {
        return {
            id: matchedPhrase.id,
            text: matchedPhrase.text,
            assetPath: matchedPhrase.assetPath,
        }
    }

    return fallbackPhrase
}

/**
 * Resolve the best matching pre-generated greeting asset for a role.
 *
 * The flow currently exposes a small fixed role set. If a route is opened
 * with an unexpected role string, we intentionally fall back to a generic
 * greeting instead of synthesizing a new runtime phrase.
 */
export function resolveGreetingPhrase(role: string): HostVoicePhrase {
    return resolveRolePhrase(role, manifest.greetings, manifest.genericGreeting)
}

/**
 * Resolve the first spoken interview question that is owned by the host.
 * This avoids a "double opening" where the live model adds its own greeting
 * before the first real technical question.
 */
export function resolveOpeningQuestionPhrase(role: string): HostVoicePhrase {
    return resolveRolePhrase(role, manifest.firstQuestions, manifest.genericFirstQuestion)
}

export function getLastQuestionPhrase(): HostVoicePhrase {
    return manifest.lastQuestion
}

export function getFarewellPhrase(): HostVoicePhrase {
    return manifest.farewell
}

export function getTechnicalErrorFarewellPhrase(): HostVoicePhrase {
    return manifest.technicalErrorFarewell
}
