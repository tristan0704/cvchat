// Typ für die Übergänge der Sprachaktivität: entweder beginnt oder endet die Sprache, oder es gibt keinen Übergang
export type SpeechActivityTransition = "speech-started" | "speech-ended" | null

// Konfigurationsmöglichkeiten für die Sprachaktivität
export type SpeechActivityConfig = {
    speakingThreshold: number // Schwellenwert für Sprachaktivität (ab dieser Lautstärke gilt es als Sprechen)
    silenceThreshold: number // Schwellenwert für Stille (unter dieser Lautstärke gilt es als Stille)
    speechStartHoldMs: number // Zeit in Millisekunden, die man beim Start sprechen muss, bevor es als aktiv gilt
    speechEndHoldMs: number // Zeit in Millisekunden, die man still sein muss, bevor es als inaktiv gilt
}

// Zustand der Sprachaktivität
export type SpeechActivityState = {
    isSpeaking: boolean // Gibt an, ob zurzeit gesprochen wird
    aboveThresholdSinceMs: number | null // Wann die Lautstärkeschwelle zuletzt überschritten wurde (Millisekunden)
    belowThresholdSinceMs: number | null // Wann die Lautstärkeschwelle zuletzt unterschritten wurde (Millisekunden)
    lastNonSilentAtMs: number | null // Wann zuletzt ein nicht-stiller Ton erkannt wurde (Millisekunden)
}

// Standardkonfiguration für die Sprachaktivität
export const DEFAULT_SPEECH_ACTIVITY_CONFIG: SpeechActivityConfig = {
    speakingThreshold: 0.015, // Standardwert für die Sprachschwelle
    silenceThreshold: 0.008, // Standardwert für die Stille-Schwelle
    speechStartHoldMs: 120, // 120 Millisekunden Haltezeit, um als Sprache erkannt zu werden
    speechEndHoldMs: 2_500, // 2500 Millisekunden Haltezeit, um als Stille erkannt zu werden
}

// Funktion zum Erstellen eines neuen Zustands der Sprachaktivität
export function createSpeechActivityState(): SpeechActivityState {
    return {
        isSpeaking: false, // Anfangszustand: es wird nicht gesprochen
        aboveThresholdSinceMs: null, // Keine Überschreitung der Schwelle
        belowThresholdSinceMs: null, // Keine Unterschreitung der Schwelle
        lastNonSilentAtMs: null, // Keine nicht-stillen Töne erkannt
    }
}

// Funktion zur Berechnung des RMS (Root Mean Square) eines Audiobereichs
export function getChunkRms(samples: Float32Array): number {
    if (samples.length === 0) return 0 // Wenn es keine Samples gibt, ist der RMS 0

    let sum = 0
    for (let index = 0; index < samples.length; index += 1) {
        const sample = samples[index] // Hole den aktuellen Sample-Wert
        sum += sample * sample // Addiere das Quadrat des Sample-Werts
    }

    return Math.sqrt(sum / samples.length) // Berechne die Wurzel des Durchschnitts der Quadrate
}

// Funktion zum Aktualisieren des Zustands der Sprachaktivität basierend auf den aktuellen Audioinformationen
export function updateSpeechActivityState(
    state: SpeechActivityState, // Der aktuelle Zustand
    rms: number, // Die Lautstärke (Root Mean Square) des aktuellen Audios
    nowMs = Date.now(), // Der aktuelle Zeitstempel, standardmäßig jetzt
    config: SpeechActivityConfig = DEFAULT_SPEECH_ACTIVITY_CONFIG // Die Konfiguration, standardmäßig die voreingestellte
): SpeechActivityTransition {
    if (!state.isSpeaking) { // Wenn aktuell nicht gesprochen wird
        if (rms >= config.speakingThreshold) { // Wenn die Lautstärkeschwelle überschritten wird
            state.lastNonSilentAtMs = nowMs // Aktualisiere die Zeit des letzten nicht-stillen Tons
            state.aboveThresholdSinceMs ??= nowMs // Setze die Überschreitungsschwelle, falls noch nicht gesetzt
            if (nowMs - state.aboveThresholdSinceMs >= config.speechStartHoldMs) { // Wenn die Haltezeit erfüllt ist
                state.isSpeaking = true // Sprache als aktiv markieren
                state.aboveThresholdSinceMs = null // Rücksetzen des Schwellenwertes
                state.belowThresholdSinceMs = null // Rücksetzen des Stille-Zeitpunkts
                return "speech-started" // Rückgabe: Sprache hat begonnen
            }
        } else { // Wenn die Lautstärkeschwelle nicht überschritten wird
            state.aboveThresholdSinceMs = null // Rücksetzen des Schwellenwertes
        }

        return null // Kein Zustandsübergang
    }

    if (rms <= config.silenceThreshold) { // Wenn die Lautstärke unter den Stille-Schwellenwert fällt
        state.belowThresholdSinceMs ??= nowMs // Setze den Stille-Zeitstempel, falls er noch nicht gesetzt ist
        if (nowMs - state.belowThresholdSinceMs >= config.speechEndHoldMs) { // Wenn die Stille-Haltezeit erfüllt ist
            state.isSpeaking = false // Sprache als inaktiv markieren
            state.aboveThresholdSinceMs = null // Rücksetzen des Schwellenwertes
            state.belowThresholdSinceMs = null // Rücksetzen des Stille-Zeitpunkts
            return "speech-ended" // Rückgabe: Sprache hat geendet
        }
    } else { // Wenn die Lautstärke über der Stille-Schwelle liegt
        state.lastNonSilentAtMs = nowMs // Aktualisiere die Zeit des letzten nicht-stillen Tons
        state.belowThresholdSinceMs = null // Rücksetzen des Stille-Zeitpunkts
    }

    return null // Kein Zustandsübergang
}