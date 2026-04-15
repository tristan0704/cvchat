export type CodingChallengeRole = "frontend" | "fullstack" | "backend";

export type CodingChallengeLanguage = "javascript" | "python" | "java";

export type CodingChallengeDifficulty = "easy" | "medium" | "hard";

export type CodingChallengeTaskSolution = {
  approach: string;
  code: string;
};

export type CodingChallengeTask = {
  id: string;
  name: string;
  role: CodingChallengeRole;
  language: CodingChallengeLanguage;
  difficulty: CodingChallengeDifficulty;
  estimatedMinutes: number;
  description: string;
  statement: string;
  requirements: string[];
  evaluationFocus: string[];
  starterCode: string;
  examples: string[];
  solution: CodingChallengeTaskSolution;
};

export type CodingChallengeTaskManifest = {
  tasks: CodingChallengeTask[];
};

export type PublicCodingChallengeTask = Omit<CodingChallengeTask, "solution">;

export type CodingChallengeDraft = {
  attemptId: string;
  task: PublicCodingChallengeTask;
  code: string;
  evaluation?: CodingChallengeEvaluation | null;
  status?: string;
  submittedAt?: string | null;
  lastEditedAt?: string | null;
};

export type CodingChallengeEvaluationDimension = {
  score: number;
  feedback: string;
};

export type CodingChallengeEvaluation = {
  attemptId?: string;
  taskId: string;
  submittedAt: string;
  overallScore: number;
  passedLikely: boolean;
  summary: string;
  correctness: CodingChallengeEvaluationDimension;
  codeQuality: CodingChallengeEvaluationDimension;
  problemSolving: CodingChallengeEvaluationDimension;
  strengths: string[];
  issues: string[];
  improvements: string[];
};

export type CodingChallengeEvaluationRequest = {
  attemptId: string;
  code: string;
};

export type CodingChallengeEvaluationResponse = {
  draft?: CodingChallengeDraft;
  evaluation: CodingChallengeEvaluation;
};
