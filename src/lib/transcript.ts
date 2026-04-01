/**
 * Transcript management utilities for the voice interview flow.
 *
 * Transcript Flow:
 * 1. During the call, Gemini streams live transcription events for the
 *    candidate (inputTranscription) while recruiter turns are taken from the
 *    model's canonical text output.
 * 2. Partial transcripts are buffered in pending refs until the segment is
 *    clearly complete, either through `finished` or a turn boundary.
 * 3. Completed segments are normalized and appended to the transcript entries array.
 * 4. After the call ends, entries are paired into Q&A format for export.
 * 5. Separately, the full candidate audio recording is sent to the
 *    transcription API for a higher-quality post-call transcript.
 * 6. All transcript state is persisted to sessionStorage so that a
 *    subsequent feedback page can pick it up without prop-drilling.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Speaker = "candidate" | "interviewer" | "system"

export type TranscriptEntry = {
    id: string
    speaker: Speaker
    text: string
}

export type TranscriptQaPair = {
    question: string
    answer: string
}

export type PostCallTranscriptStatus = "idle" | "recording" | "transcribing" | "ready" | "error"

export type VoiceFeedbackDraft = {
    role: string
    transcriptEntries: TranscriptEntry[]
    postCallCandidateTranscript: string
    mappedTranscriptQaPairs?: TranscriptQaPair[]
    postCallTranscriptStatus: PostCallTranscriptStatus
    postCallTranscriptError: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Session storage key for the post-call transcript/feedback handoff. */
export const VOICE_FEEDBACK_DRAFT_STORAGE_KEY = "voiceInterviewFeedbackDraft"

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------

/** Collapse whitespace and fix punctuation spacing in raw transcript text. */
export function normalizeTranscriptText(text: string): string {
    return text.replace(/\s+/g, " ").replace(/\s+([,.!?;:])/g, "$1").trim()
}

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

// ---------------------------------------------------------------------------
// Q&A pairing
// ---------------------------------------------------------------------------

/**
 * Group transcript entries into interviewer-question / candidate-answer pairs.
 * System entries are skipped. Consecutive entries from the same speaker are
 * collapsed into a single turn before pairing.
 */
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

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

type TranscriptQaExportOptions = {
    qaPairs?: TranscriptQaPair[]
    candidateTranscript?: string
}

/** Build a plain-text export of the transcript in numbered Q&A format. */
export function buildTranscriptQaExport(role: string, entries: TranscriptEntry[], options?: TranscriptQaExportOptions): string {
    const pairs = normalizeTranscriptQaPairs(options?.qaPairs?.length ? options.qaPairs : buildTranscriptQaPairs(entries))
    const fullTranscriptEntries = collapseTranscriptTurns(entries)
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

// ---------------------------------------------------------------------------
// Session storage persistence
// ---------------------------------------------------------------------------

/**
 * Persist the current voice interview state to sessionStorage.
 * This allows the feedback page to read the draft without requiring
 * a shared state store or URL parameters for large payloads.
 */
export function persistVoiceFeedbackDraft(args: VoiceFeedbackDraft): void {
    if (typeof window === "undefined") return

    window.sessionStorage.setItem(
        VOICE_FEEDBACK_DRAFT_STORAGE_KEY,
        JSON.stringify({
            role: args.role,
            mode: "voice",
            transcriptEntries: args.transcriptEntries,
            postCallCandidateTranscript: args.postCallCandidateTranscript,
            mappedTranscriptQaPairs: args.mappedTranscriptQaPairs ?? [],
            postCallTranscriptStatus: args.postCallTranscriptStatus,
            postCallTranscriptError: args.postCallTranscriptError,
            updatedAt: new Date().toISOString(),
        })
    )
}
