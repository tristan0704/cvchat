export type InterviewFeedbackEvaluationDimension = {
    score: number
    feedback: string
}

export type InterviewFeedbackEvaluation = {
    analyzedAt: string
    role: string
    transcriptFingerprint: string
    overallScore: number
    passedLikely: boolean
    summary: string
    communication: InterviewFeedbackEvaluationDimension
    answerQuality: InterviewFeedbackEvaluationDimension
    roleFit: InterviewFeedbackEvaluationDimension
    strengths: string[]
    issues: string[]
    improvements: string[]
}

export type InterviewFeedbackRequest = {
    role: string
    experience?: string
    companySize?: string
    interviewType?: string
    transcript: string
    transcriptFingerprint: string
}

export type InterviewFeedbackResponse = {
    evaluation: InterviewFeedbackEvaluation
}
