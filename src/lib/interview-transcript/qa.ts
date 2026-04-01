import { normalizeTranscriptText } from "@/lib/interview-transcript/text"
import type { TranscriptEntry, TranscriptQaPair } from "@/lib/interview-transcript/types"

const INTERVIEWER_QUESTION_PREFIXES = [
    "warum",
    "wie",
    "was",
    "welche",
    "welcher",
    "welches",
    "welchen",
    "welchem",
    "woran",
    "wann",
    "wo",
    "wer",
    "wieso",
    "weshalb",
    "inwiefern",
    "beschreibe",
    "erzaehl",
    "erklaere",
    "nimm",
    "stell dir vor",
    "kannst du",
    "koennen sie",
    "koennten sie",
    "magst du",
]

function isLikelyInterviewerQuestion(text: string): boolean {
    const normalized = normalizeTranscriptText(text).toLowerCase()
    if (!normalized) return false
    if (normalized.includes("?")) return true

    return INTERVIEWER_QUESTION_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

function collapseTranscriptTurns(entries: TranscriptEntry[]): TranscriptEntry[] {
    const collapsedTurns: TranscriptEntry[] = []

    for (const entry of entries) {
        if (entry.speaker === "system") continue

        const normalizedText = normalizeTranscriptText(entry.text)
        if (!normalizedText) continue

        const previousTurn = collapsedTurns[collapsedTurns.length - 1]
        if (previousTurn?.speaker === entry.speaker) {
            collapsedTurns[collapsedTurns.length - 1] = {
                ...previousTurn,
                text: `${previousTurn.text} ${normalizedText}`.trim(),
            }
            continue
        }

        collapsedTurns.push({
            ...entry,
            text: normalizedText,
        })
    }

    return collapsedTurns
}

export function extractInterviewerQuestions(entries: TranscriptEntry[]): string[] {
    const interviewerTurns = collapseTranscriptTurns(entries)
        .filter((entry) => entry.speaker === "interviewer")
        .map((entry) => entry.text)

    const likelyQuestions = interviewerTurns.filter((entry) => isLikelyInterviewerQuestion(entry))
    return likelyQuestions.length ? likelyQuestions : interviewerTurns
}

export function normalizeTranscriptQaPairs(pairs: TranscriptQaPair[]): TranscriptQaPair[] {
    return pairs
        .map((pair) => ({
            question: normalizeTranscriptText(pair.question),
            answer: normalizeTranscriptText(pair.answer),
        }))
        .filter((pair) => !!pair.question)
        .map((pair) => ({
            ...pair,
            answer: pair.answer || "(keine Antwort erfasst)",
        }))
}

export function buildTranscriptQaPairs(entries: TranscriptEntry[]): TranscriptQaPair[] {
    const turns = collapseTranscriptTurns(entries)
    const pairs: TranscriptQaPair[] = []
    let activeQuestion = ""
    let activeAnswer = ""

    for (const entry of turns) {
        if (entry.speaker === "interviewer") {
            if (activeQuestion) {
                pairs.push({
                    question: activeQuestion,
                    answer: activeAnswer || "(keine Antwort erfasst)",
                })
            }

            activeQuestion = entry.text
            activeAnswer = ""
            continue
        }

        if (!activeQuestion) continue
        activeAnswer = activeAnswer ? `${activeAnswer} ${entry.text}` : entry.text
    }

    if (activeQuestion) {
        pairs.push({
            question: activeQuestion,
            answer: activeAnswer || "(keine Antwort erfasst)",
        })
    }

    return pairs
}
