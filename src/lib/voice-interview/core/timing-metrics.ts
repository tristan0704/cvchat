import {normalizeTranscriptText} from "@/lib/interview-transcript"
import type {InterviewTimingMetrics} from "@/lib/voice-interview/core/types"

// Typdefinitionen für die Argumente der Funktion `buildInterviewTimingMetrics`
type BuildInterviewTimingMetricsArgs = {
    candidateAnswerDurationsMs: number[] // Liste der Dauern der Antworten des Kandidaten in Millisekunden
    candidateResponseLatenciesMs: number[] // Liste der Antwortverzögerungen des Kandidaten in Millisekunden
    candidateTranscriptWordSource: string // Quelltext für die Analyse der Kandidatenwörter
}

// Summiert alle Werte in einem Zahlenarray
export function sumMetricValues(values: number[]): number {
    return values.reduce((total, value) => total + value, 0)
}

// Berechnet den Durchschnitt aller Werte in einem Zahlenarray
export function averageMetricValues(values: number[]): number {
    return values.length ? sumMetricValues(values) / values.length : 0
}

// Zählt die Anzahl der Wörter in einem gegebenen Text
export function countTranscriptWords(text: string): number {
    const normalized = normalizeTranscriptText(text) // Normalisiert den Text (entfernt überflüssige Leerzeichen, etc.)
    if (!normalized) return 0 // Gibt 0 zurück, wenn der normalisierte Text leer ist

    return normalized.split(/\s+/).filter((word) => !!word).length // Wörter zählen
}

// Baut die Timing-Metriken für ein Interview basierend auf den Eingabeargumenten
export function buildInterviewTimingMetrics({
                                                candidateAnswerDurationsMs,
                                                candidateResponseLatenciesMs,
                                                candidateTranscriptWordSource,
                                            }: BuildInterviewTimingMetricsArgs): InterviewTimingMetrics {
    const answerCount = candidateAnswerDurationsMs.length // Anzahl der Antworten des Kandidaten
    const totalCandidateSpeechMs = sumMetricValues(candidateAnswerDurationsMs) // Gesamtdauer der Kandidatenantworten
    const candidateWordCount = countTranscriptWords(candidateTranscriptWordSource) // Gesamtanzahl der gesprochenen Wörter

    return {
        answerCount, // Anzahl der Antworten
        totalCandidateSpeechMs, // Gesamtdauer der Redebeiträge
        averageAnswerDurationMs: averageMetricValues(candidateAnswerDurationsMs), // Durchschnittliche Antwortdauer
        longestAnswerDurationMs: answerCount ? Math.max(...candidateAnswerDurationsMs) : 0, // Längste Antwortdauer
        shortestAnswerDurationMs: answerCount ? Math.min(...candidateAnswerDurationsMs) : 0, // Kürzeste Antwortdauer
        averageResponseLatencyMs: averageMetricValues(candidateResponseLatenciesMs), // Durchschnittliche Verzögerung
        longestResponseLatencyMs: candidateResponseLatenciesMs.length ? Math.max(...candidateResponseLatenciesMs) : 0, // Längste Verzögerung
        candidateWordsPerMinute:
            totalCandidateSpeechMs > 0 && candidateWordCount > 0
                ? Math.round(candidateWordCount / (totalCandidateSpeechMs / 60_000)) // Kandidatenwörter pro Minute berechnen
                : null, // Falls keine Daten vorhanden sind, null zurückgeben
    }
}