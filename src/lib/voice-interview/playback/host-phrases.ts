import voiceHostPhraseManifest from "@/config/voice-host-phrases.json"
import { normalizeLanguage, type AppLanguage } from "@/lib/i18n/dictionaries"

//Funktionen zum Laden und Verwalten von Host-Phrasen

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

type LanguagePhraseSet = {
    greetings: GreetingPhraseConfig[]
    genericGreeting: FixedPhraseConfig
    firstQuestions: GreetingPhraseConfig[]
    genericFirstQuestion: FixedPhraseConfig
    lastQuestion: FixedPhraseConfig
    farewell: FixedPhraseConfig
    technicalErrorFarewell: FixedPhraseConfig
}

type VoiceHostPhraseManifest = {
    voiceName: string
    assetLoadFallbackTimeoutMs: number
    closingHardStopTimeoutMs: number
    languages: Record<AppLanguage, LanguagePhraseSet>
}

export type HostVoicePhrase = FixedPhraseConfig & {
    language: AppLanguage
    speechSynthesisLang: "de-DE" | "en-US"
}

const manifest = voiceHostPhraseManifest as VoiceHostPhraseManifest

export const HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS = manifest.assetLoadFallbackTimeoutMs
export const HOST_CLOSING_HARD_STOP_TIMEOUT_MS = manifest.closingHardStopTimeoutMs

function getSpeechSynthesisLang(language: AppLanguage) {
    return language === "en" ? "en-US" : "de-DE"
}

function withPhraseLanguage(phrase: FixedPhraseConfig, language: AppLanguage): HostVoicePhrase {
    return {
        ...phrase,
        language,
        speechSynthesisLang: getSpeechSynthesisLang(language),
    }
}

function getPhraseSet(language: unknown) {
    const normalizedLanguage = normalizeLanguage(language)
    return {
        language: normalizedLanguage,
        phrases: manifest.languages[normalizedLanguage] ?? manifest.languages.de,
    }
}

function resolveRolePhrase(role: string, language: unknown, roleSpecificPhrases: GreetingPhraseConfig[], fallbackPhrase: FixedPhraseConfig): HostVoicePhrase {
    const normalizedRole = role.trim().toLowerCase()
    const matchedPhrase = roleSpecificPhrases.find((phrase) =>
        phrase.matchers.some((matcher) => normalizedRole.includes(matcher))
    )
    const normalizedLanguage = normalizeLanguage(language)

    if (matchedPhrase) {
        return withPhraseLanguage(matchedPhrase, normalizedLanguage)
    }

    return withPhraseLanguage(fallbackPhrase, normalizedLanguage)
}

export function resolveGreetingPhrase(role: string, language: unknown = "de"): HostVoicePhrase {
    const phraseSet = getPhraseSet(language)
    return resolveRolePhrase(role, phraseSet.language, phraseSet.phrases.greetings, phraseSet.phrases.genericGreeting)
}

export function resolveOpeningQuestionPhrase(role: string, language: unknown = "de"): HostVoicePhrase {
    const phraseSet = getPhraseSet(language)
    return resolveRolePhrase(role, phraseSet.language, phraseSet.phrases.firstQuestions, phraseSet.phrases.genericFirstQuestion)
}

export function getLastQuestionPhrase(language: unknown = "de"): HostVoicePhrase {
    const phraseSet = getPhraseSet(language)
    return withPhraseLanguage(phraseSet.phrases.lastQuestion, phraseSet.language)
}

export function getFarewellPhrase(language: unknown = "de"): HostVoicePhrase {
    const phraseSet = getPhraseSet(language)
    return withPhraseLanguage(phraseSet.phrases.farewell, phraseSet.language)
}

export function getTechnicalErrorFarewellPhrase(language: unknown = "de"): HostVoicePhrase {
    const phraseSet = getPhraseSet(language)
    return withPhraseLanguage(phraseSet.phrases.technicalErrorFarewell, phraseSet.language)
}
