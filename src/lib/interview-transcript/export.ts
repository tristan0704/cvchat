import { buildTranscriptQaPairs, normalizeTranscriptQaPairs } from "@/lib/interview-transcript/qa"
import { normalizeTranscriptText } from "@/lib/interview-transcript/text"
import type { TranscriptEntry, TranscriptQaPair } from "@/lib/interview-transcript/types"

type TranscriptQaExportOptions = {
    qaPairs?: TranscriptQaPair[]
    candidateTranscript?: string
}

function collapseExportTurns(entries: TranscriptEntry[]): TranscriptEntry[] {
    return entries
        .filter((entry) => entry.speaker !== "system")
        .reduce<TranscriptEntry[]>((collapsed, entry) => {
            const normalizedText = normalizeTranscriptText(entry.text)
            if (!normalizedText) return collapsed

            const previousTurn = collapsed[collapsed.length - 1]
            if (previousTurn?.speaker === entry.speaker) {
                collapsed[collapsed.length - 1] = {
                    ...previousTurn,
                    text: `${previousTurn.text} ${normalizedText}`.trim(),
                }
                return collapsed
            }

            collapsed.push({
                ...entry,
                text: normalizedText,
            })

            return collapsed
        }, [])
}

export function buildTranscriptQaExport(role: string, entries: TranscriptEntry[], options?: TranscriptQaExportOptions): string {
    const pairs = normalizeTranscriptQaPairs(options?.qaPairs?.length ? options.qaPairs : buildTranscriptQaPairs(entries))
    const fullTranscriptEntries = collapseExportTurns(entries)
    const interviewerEntries = fullTranscriptEntries.filter((entry) => entry.speaker === "interviewer")
    const candidateTranscript = normalizeTranscriptText(options?.candidateTranscript || "")

    if (!pairs.length && !fullTranscriptEntries.length && !candidateTranscript) return ""

    const transcriptSection = candidateTranscript
        ? [
            "Interviewer-Verlauf:",
            ...interviewerEntries.flatMap((entry) => [`Interviewer: ${entry.text}`]),
            "",
            "Kandidaten-Volltranskript:",
            candidateTranscript,
        ]
        : [
            "Volltranskript:",
            ...fullTranscriptEntries.flatMap((entry) => [`${entry.speaker === "candidate" ? "Kandidat" : "Interviewer"}: ${entry.text}`]),
        ]

    return [
        `Rolle: ${role}`,
        `Exportiert: ${new Date().toISOString()}`,
        "",
        ...transcriptSection,
        "",
        "Q&A-Auszug:",
        ...pairs.flatMap((pair, index) => [
            `${index + 1}.`,
            `Frage: ${pair.question}`,
            `Antwort: ${pair.answer}`,
            "",
        ]),
    ].join("\n")
}
