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

//Typen und States

export type PostCallTranscriptStatus = "idle" | "recording" | "transcribing" | "ready" | "error"

export type VoiceFeedbackDraft = {
    role: string
    transcriptEntries: TranscriptEntry[]
    postCallCandidateTranscript: string
    mappedTranscriptQaPairs?: TranscriptQaPair[]
    postCallTranscriptStatus: PostCallTranscriptStatus
    postCallTranscriptError: string
}

export type VoiceFeedbackDraftPersistence = Partial<VoiceFeedbackDraft>
