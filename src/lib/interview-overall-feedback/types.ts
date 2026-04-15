export type InterviewOverallFeedback = {
    analyzedAt: string;
    overallScore: number;
    summary: string;
    strengths: string[];
    issues: string[];
    improvements: string[];
    cvScore: number | null;
    interviewScore: number | null;
    codingChallengeScore: number | null;
};

export type InterviewOverallFeedbackResponse = {
    overallFeedback: InterviewOverallFeedback;
};
