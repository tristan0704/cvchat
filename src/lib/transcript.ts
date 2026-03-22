/**
 * Transcript management utilities for the voice interview flow.
 *
 * Transcript Flow:
 * 1. During the call, Gemini streams live transcription events for both
 *    the candidate (inputTranscription) and the interviewer (outputTranscription).
 * 2. Partial transcripts are buffered in pending refs until `finished` is true.
 * 3. Finished segments are normalized and appended to the transcript entries array.
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

// ---------------------------------------------------------------------------
// Q&A pairing
// ---------------------------------------------------------------------------

/**
 * Group transcript entries into interviewer-question / candidate-answer pairs.
 * System entries are skipped. A new pair starts whenever the interviewer speaks.
 */
export function buildTranscriptQaPairs(entries: TranscriptEntry[]): TranscriptQaPair[] {
    const pairs: TranscriptQaPair[] = []
    let activeQuestion = ""
    let activeAnswer = ""

    for (const entry of entries) {
        if (entry.speaker === "system") continue

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

/** Build a plain-text export of the transcript in numbered Q&A format. */
export function buildTranscriptQaExport(role: string, entries: TranscriptEntry[]): string {
    const pairs = buildTranscriptQaPairs(entries)
    const fullTranscriptEntries = entries.filter((entry) => entry.speaker !== "system")

    if (!pairs.length && !fullTranscriptEntries.length) return ""

    return [
        `Rolle: ${role}`,
        `Exportiert: ${new Date().toISOString()}`,
        "",
        "Volltranskript:",
        ...fullTranscriptEntries.flatMap((entry) => [`${entry.speaker === "candidate" ? "Kandidat" : "Interviewer"}: ${entry.text}`]),
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
            postCallTranscriptStatus: args.postCallTranscriptStatus,
            postCallTranscriptError: args.postCallTranscriptError,
            updatedAt: new Date().toISOString(),
        })
    )
}
