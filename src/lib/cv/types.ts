export type InterviewCvConfig = {
  role: string;
  experience: string;
  companySize: string;
  interviewType: string;
};

export type CvQualityDimension = {
  score: number;
  feedback: string;
};

export type CvQualityAnalysis = {
  overallScore: number;
  sections: CvQualityDimension;
  impact: CvQualityDimension;
  length: CvQualityDimension;
  contact: CvQualityDimension;
  clarity: CvQualityDimension;
  improvements: string[];
};

export type CvRoleMatchAnalysis = {
  score: number;
  matched: string[];
  missingMustHave: string[];
  niceToHaveMatches: string[];
  bonusMatches: string[];
  summary: string;
};

export type CvScoreBreakdown = {
  keywordScore: number;
  llmScore: number;
  blendedScore: number;
  keywordWeight: number;
  llmWeight: number;
};

export type CvFeedbackResult = {
  fileName: string;
  analyzedAt: string;
  config: InterviewCvConfig;
  quality: CvQualityAnalysis;
  roleAnalysis: CvRoleMatchAnalysis;
  scoreBreakdown: CvScoreBreakdown;
};
