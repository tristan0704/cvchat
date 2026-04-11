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

export function resolveGreetingPhrase(role: string): HostVoicePhrase {
    return resolveRolePhrase(role, manifest.greetings, manifest.genericGreeting)
}

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
