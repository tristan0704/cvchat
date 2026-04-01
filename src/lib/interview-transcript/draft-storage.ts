import type { VoiceFeedbackDraft } from "@/lib/interview-transcript/types"

export const VOICE_FEEDBACK_DRAFT_STORAGE_KEY = "voiceInterviewFeedbackDraft"

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
