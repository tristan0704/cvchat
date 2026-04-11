import { normalizeTranscriptText } from "@/lib/interview-transcript"
import type { InterviewTimingMetrics } from "@/lib/voice-interview/core/types"

type BuildInterviewTimingMetricsArgs = {
    candidateAnswerDurationsMs: number[]
    candidateResponseLatenciesMs: number[]
    candidateTranscriptWordSource: string
}

export function sumMetricValues(values: number[]): number {
    return values.reduce((total, value) => total + value, 0)
}

export function averageMetricValues(values: number[]): number {
    return values.length ? sumMetricValues(values) / values.length : 0
}

export function countTranscriptWords(text: string): number {
    const normalized = normalizeTranscriptText(text)
    if (!normalized) return 0

    return normalized.split(/\s+/).filter((word) => !!word).length
}

export function buildInterviewTimingMetrics({
    candidateAnswerDurationsMs,
    candidateResponseLatenciesMs,
    candidateTranscriptWordSource,
}: BuildInterviewTimingMetricsArgs): InterviewTimingMetrics {
    const answerCount = candidateAnswerDurationsMs.length
    const totalCandidateSpeechMs = sumMetricValues(candidateAnswerDurationsMs)
    const candidateWordCount = countTranscriptWords(candidateTranscriptWordSource)

    return {
        answerCount,
        totalCandidateSpeechMs,
        averageAnswerDurationMs: averageMetricValues(candidateAnswerDurationsMs),
        longestAnswerDurationMs: answerCount ? Math.max(...candidateAnswerDurationsMs) : 0,
        shortestAnswerDurationMs: answerCount ? Math.min(...candidateAnswerDurationsMs) : 0,
        averageResponseLatencyMs: averageMetricValues(candidateResponseLatenciesMs),
        longestResponseLatencyMs: candidateResponseLatenciesMs.length ? Math.max(...candidateResponseLatenciesMs) : 0,
        candidateWordsPerMinute:
            totalCandidateSpeechMs > 0 && candidateWordCount > 0
                ? Math.round(candidateWordCount / (totalCandidateSpeechMs / 60_000))
                : null,
    }
}
