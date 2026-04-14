-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('draft', 'ready', 'in_progress', 'analyzing', 'completed', 'failed', 'archived', 'cancelled');

-- CreateEnum
CREATE TYPE "InterviewTranscriptStatus" AS ENUM ('idle', 'recording', 'transcribing', 'ready', 'error');

-- CreateEnum
CREATE TYPE "InterviewRecapStatus" AS ENUM ('idle', 'recording', 'ready', 'error');

-- CreateEnum
CREATE TYPE "TranscriptSpeaker" AS ENUM ('candidate', 'interviewer', 'system');

-- CreateEnum
CREATE TYPE "InterviewQaPairSource" AS ENUM ('derived', 'ai_mapped');

-- CreateEnum
CREATE TYPE "FaceAnalysisOverallStatus" AS ENUM ('strong', 'okay', 'watch', 'critical');

-- CreateEnum
CREATE TYPE "CodingChallengeRole" AS ENUM ('frontend', 'fullstack', 'backend');

-- CreateEnum
CREATE TYPE "CodingChallengeLanguage" AS ENUM ('javascript', 'python', 'java');

-- CreateEnum
CREATE TYPE "CodingChallengeDifficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "CodingChallengeAttemptStatus" AS ENUM ('assigned', 'draft', 'submitted', 'evaluated', 'error', 'abandoned');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "targetRole" TEXT,
    "experienceLevel" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvVersion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT DEFAULT 'application/pdf',
    "fileSizeBytes" INTEGER,
    "storageBucket" TEXT,
    "storagePath" TEXT,
    "extractedText" TEXT,
    "extractedTextHash" TEXT,
    "browserFingerprint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvFeedbackAnalysis" (
    "id" UUID NOT NULL,
    "cvVersionId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "experience" TEXT NOT NULL DEFAULT '',
    "companySize" TEXT NOT NULL DEFAULT '',
    "interviewType" TEXT NOT NULL DEFAULT '',
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,
    "overallScore" INTEGER NOT NULL,
    "keywordScore" INTEGER NOT NULL,
    "llmScore" INTEGER NOT NULL,
    "blendedScore" INTEGER NOT NULL,
    "keywordWeight" DOUBLE PRECISION NOT NULL,
    "llmWeight" DOUBLE PRECISION NOT NULL,
    "sectionsScore" INTEGER NOT NULL,
    "sectionsFeedback" TEXT NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "impactFeedback" TEXT NOT NULL,
    "lengthScore" INTEGER NOT NULL,
    "lengthFeedback" TEXT NOT NULL,
    "contactScore" INTEGER NOT NULL,
    "contactFeedback" TEXT NOT NULL,
    "clarityScore" INTEGER NOT NULL,
    "clarityFeedback" TEXT NOT NULL,
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roleMatchScore" INTEGER NOT NULL,
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingMustHaveKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "niceToHaveMatches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bonusMatches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roleSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvFeedbackAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cvVersionId" UUID,
    "cvFeedbackAnalysisId" UUID,
    "title" TEXT,
    "role" TEXT NOT NULL,
    "experience" TEXT NOT NULL DEFAULT '',
    "companySize" TEXT NOT NULL DEFAULT '',
    "interviewType" TEXT NOT NULL DEFAULT '',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "status" "InterviewStatus" NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPlannedQuestion" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "questionKey" TEXT,
    "text" TEXT NOT NULL,
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPlannedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTranscript" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "transcriptStatus" "InterviewTranscriptStatus" NOT NULL DEFAULT 'idle',
    "transcriptError" TEXT,
    "candidateTranscript" TEXT,
    "transcriptExport" TEXT,
    "transcriptFingerprint" TEXT,
    "interviewerQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qaMappingModel" TEXT,
    "candidateAudioBucket" TEXT,
    "candidateAudioPath" TEXT,
    "candidateAudioMimeType" TEXT,
    "candidateAudioBytes" INTEGER,
    "recapStatus" "InterviewRecapStatus" NOT NULL DEFAULT 'idle',
    "recapError" TEXT,
    "recapCaptureNote" TEXT,
    "recapAudioBucket" TEXT,
    "recapAudioPath" TEXT,
    "recapAudioMimeType" TEXT,
    "recapAudioBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTranscriptEntry" (
    "id" UUID NOT NULL,
    "interviewTranscriptId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "speaker" "TranscriptSpeaker" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewTranscriptEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTranscriptQaPair" (
    "id" UUID NOT NULL,
    "interviewTranscriptId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "source" "InterviewQaPairSource" NOT NULL DEFAULT 'derived',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewTranscriptQaPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTimingMetrics" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "totalCandidateSpeechMs" INTEGER NOT NULL DEFAULT 0,
    "averageAnswerDurationMs" INTEGER NOT NULL DEFAULT 0,
    "longestAnswerDurationMs" INTEGER NOT NULL DEFAULT 0,
    "shortestAnswerDurationMs" INTEGER NOT NULL DEFAULT 0,
    "averageResponseLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "longestResponseLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "candidateWordsPerMinute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewTimingMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "transcriptFingerprint" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "passedLikely" BOOLEAN NOT NULL,
    "summary" TEXT NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "communicationFeedback" TEXT NOT NULL,
    "answerQualityScore" INTEGER NOT NULL,
    "answerQualityFeedback" TEXT NOT NULL,
    "roleFitScore" INTEGER NOT NULL,
    "roleFitFeedback" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFaceAnalysis" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisVersion" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "role" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "durationLabel" TEXT NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "windowCount" INTEGER NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "overallStatus" "FaceAnalysisOverallStatus" NOT NULL,
    "faceDetectedPct" DOUBLE PRECISION NOT NULL,
    "avgFrontalFacingScore" DOUBLE PRECISION NOT NULL,
    "avgHeadMovement" DOUBLE PRECISION NOT NULL,
    "avgEyeOpenness" DOUBLE PRECISION NOT NULL,
    "avgMouthOpenness" DOUBLE PRECISION NOT NULL,
    "avgSpeakingLikelihood" DOUBLE PRECISION NOT NULL,
    "speakingActivityPct" DOUBLE PRECISION NOT NULL,
    "blinkCount" INTEGER NOT NULL,
    "blinkRatePerMin" DOUBLE PRECISION NOT NULL,
    "stableWindowPct" DOUBLE PRECISION NOT NULL,
    "headline" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limitations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parameters" JSONB NOT NULL,
    "alerts" JSONB NOT NULL,
    "windows" JSONB NOT NULL,
    "sourceBucket" TEXT,
    "sourcePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewFaceAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingChallengeTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "CodingChallengeRole" NOT NULL,
    "language" "CodingChallengeLanguage" NOT NULL,
    "difficulty" "CodingChallengeDifficulty" NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evaluationFocus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "starterCode" TEXT NOT NULL,
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingChallengeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingChallengeTaskSolution" (
    "taskId" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingChallengeTaskSolution_pkey" PRIMARY KEY ("taskId")
);

-- CreateTable
CREATE TABLE "CodingChallengeAttempt" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "taskId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "CodingChallengeAttemptStatus" NOT NULL DEFAULT 'assigned',
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "lastEditedAt" TIMESTAMP(3),
    "draftCode" TEXT NOT NULL,
    "submittedCode" TEXT,
    "taskSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingChallengeEvaluation" (
    "id" UUID NOT NULL,
    "codingChallengeAttemptId" UUID NOT NULL,
    "taskId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" INTEGER NOT NULL,
    "passedLikely" BOOLEAN NOT NULL,
    "summary" TEXT NOT NULL,
    "correctnessScore" INTEGER NOT NULL,
    "correctnessFeedback" TEXT NOT NULL,
    "codeQualityScore" INTEGER NOT NULL,
    "codeQualityFeedback" TEXT NOT NULL,
    "problemSolvingScore" INTEGER NOT NULL,
    "problemSolvingFeedback" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingChallengeEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "CvVersion_userId_uploadedAt_idx" ON "CvVersion"("userId", "uploadedAt");

-- CreateIndex
CREATE INDEX "CvVersion_userId_isActive_idx" ON "CvVersion"("userId", "isActive");

-- CreateIndex
CREATE INDEX "CvVersion_userId_extractedTextHash_idx" ON "CvVersion"("userId", "extractedTextHash");

-- CreateIndex
CREATE INDEX "CvFeedbackAnalysis_cvVersionId_analyzedAt_idx" ON "CvFeedbackAnalysis"("cvVersionId", "analyzedAt");

-- CreateIndex
CREATE INDEX "CvFeedbackAnalysis_role_analyzedAt_idx" ON "CvFeedbackAnalysis"("role", "analyzedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CvFeedbackAnalysis_cvVersionId_role_experience_companySize__key" ON "CvFeedbackAnalysis"("cvVersionId", "role", "experience", "companySize", "interviewType");

-- CreateIndex
CREATE INDEX "Interview_userId_createdAt_idx" ON "Interview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Interview_userId_status_createdAt_idx" ON "Interview"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Interview_cvVersionId_idx" ON "Interview"("cvVersionId");

-- CreateIndex
CREATE INDEX "Interview_cvFeedbackAnalysisId_idx" ON "Interview"("cvFeedbackAnalysisId");

-- CreateIndex
CREATE INDEX "InterviewPlannedQuestion_interviewId_priority_idx" ON "InterviewPlannedQuestion"("interviewId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPlannedQuestion_interviewId_sequence_key" ON "InterviewPlannedQuestion"("interviewId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTranscript_interviewId_key" ON "InterviewTranscript"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewTranscript_transcriptStatus_updatedAt_idx" ON "InterviewTranscript"("transcriptStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "InterviewTranscript_recapStatus_updatedAt_idx" ON "InterviewTranscript"("recapStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "InterviewTranscript_transcriptFingerprint_idx" ON "InterviewTranscript"("transcriptFingerprint");

-- CreateIndex
CREATE INDEX "InterviewTranscriptEntry_interviewTranscriptId_speaker_idx" ON "InterviewTranscriptEntry"("interviewTranscriptId", "speaker");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTranscriptEntry_interviewTranscriptId_sequence_key" ON "InterviewTranscriptEntry"("interviewTranscriptId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTranscriptQaPair_interviewTranscriptId_sequence_key" ON "InterviewTranscriptQaPair"("interviewTranscriptId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTimingMetrics_interviewId_key" ON "InterviewTimingMetrics"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewFeedback_interviewId_key" ON "InterviewFeedback"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewFeedback_role_analyzedAt_idx" ON "InterviewFeedback"("role", "analyzedAt");

-- CreateIndex
CREATE INDEX "InterviewFeedback_transcriptFingerprint_idx" ON "InterviewFeedback"("transcriptFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewFaceAnalysis_interviewId_key" ON "InterviewFaceAnalysis"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewFaceAnalysis_overallStatus_analyzedAt_idx" ON "InterviewFaceAnalysis"("overallStatus", "analyzedAt");

-- CreateIndex
CREATE INDEX "InterviewFaceAnalysis_overallScore_analyzedAt_idx" ON "InterviewFaceAnalysis"("overallScore", "analyzedAt");

-- CreateIndex
CREATE INDEX "CodingChallengeTask_role_difficulty_isActive_idx" ON "CodingChallengeTask"("role", "difficulty", "isActive");

-- CreateIndex
CREATE INDEX "CodingChallengeAttempt_interviewId_selectedAt_idx" ON "CodingChallengeAttempt"("interviewId", "selectedAt");

-- CreateIndex
CREATE INDEX "CodingChallengeAttempt_taskId_status_idx" ON "CodingChallengeAttempt"("taskId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CodingChallengeAttempt_interviewId_attemptNumber_key" ON "CodingChallengeAttempt"("interviewId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CodingChallengeEvaluation_codingChallengeAttemptId_key" ON "CodingChallengeEvaluation"("codingChallengeAttemptId");

-- CreateIndex
CREATE INDEX "CodingChallengeEvaluation_taskId_submittedAt_idx" ON "CodingChallengeEvaluation"("taskId", "submittedAt");

-- CreateIndex
CREATE INDEX "CodingChallengeEvaluation_overallScore_submittedAt_idx" ON "CodingChallengeEvaluation"("overallScore", "submittedAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvVersion" ADD CONSTRAINT "CvVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvFeedbackAnalysis" ADD CONSTRAINT "CvFeedbackAnalysis_cvVersionId_fkey" FOREIGN KEY ("cvVersionId") REFERENCES "CvVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_cvVersionId_fkey" FOREIGN KEY ("cvVersionId") REFERENCES "CvVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_cvFeedbackAnalysisId_fkey" FOREIGN KEY ("cvFeedbackAnalysisId") REFERENCES "CvFeedbackAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPlannedQuestion" ADD CONSTRAINT "InterviewPlannedQuestion_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTranscript" ADD CONSTRAINT "InterviewTranscript_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTranscriptEntry" ADD CONSTRAINT "InterviewTranscriptEntry_interviewTranscriptId_fkey" FOREIGN KEY ("interviewTranscriptId") REFERENCES "InterviewTranscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTranscriptQaPair" ADD CONSTRAINT "InterviewTranscriptQaPair_interviewTranscriptId_fkey" FOREIGN KEY ("interviewTranscriptId") REFERENCES "InterviewTranscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTimingMetrics" ADD CONSTRAINT "InterviewTimingMetrics_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewFaceAnalysis" ADD CONSTRAINT "InterviewFaceAnalysis_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingChallengeTaskSolution" ADD CONSTRAINT "CodingChallengeTaskSolution_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CodingChallengeTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingChallengeAttempt" ADD CONSTRAINT "CodingChallengeAttempt_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingChallengeAttempt" ADD CONSTRAINT "CodingChallengeAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CodingChallengeTask"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingChallengeEvaluation" ADD CONSTRAINT "CodingChallengeEvaluation_codingChallengeAttemptId_fkey" FOREIGN KEY ("codingChallengeAttemptId") REFERENCES "CodingChallengeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "CvVersion_one_active_per_user_idx"
ON "CvVersion"("userId")
WHERE "isActive" = true;

-- Row Level Security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CvVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CvFeedbackAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Interview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewPlannedQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewTranscript" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewTranscriptEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewTranscriptQaPair" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewTimingMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewFaceAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CodingChallengeTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CodingChallengeTaskSolution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CodingChallengeAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CodingChallengeEvaluation" ENABLE ROW LEVEL SECURITY;

-- User-scoped tables
CREATE POLICY "Users can view own user row"
ON "User"
FOR SELECT
TO authenticated
USING ("id" = auth.uid());

CREATE POLICY "Users can manage own profile"
ON "Profile"
FOR ALL
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can manage own settings"
ON "UserSettings"
FOR ALL
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can manage own cv versions"
ON "CvVersion"
FOR ALL
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can manage own interviews"
ON "Interview"
FOR ALL
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

-- Derived CV data
CREATE POLICY "Users can read own cv feedback analyses"
ON "CvFeedbackAnalysis"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "CvVersion"
        WHERE "CvVersion"."id" = "CvFeedbackAnalysis"."cvVersionId"
          AND "CvVersion"."userId" = auth.uid()
    )
);

-- Interview-owned read-only data
CREATE POLICY "Users can read own interview questions"
ON "InterviewPlannedQuestion"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "Interview"
        WHERE "Interview"."id" = "InterviewPlannedQuestion"."interviewId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own interview transcripts"
ON "InterviewTranscript"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "Interview"
        WHERE "Interview"."id" = "InterviewTranscript"."interviewId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own transcript entries"
ON "InterviewTranscriptEntry"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "InterviewTranscript"
        JOIN "Interview"
          ON "Interview"."id" = "InterviewTranscript"."interviewId"
        WHERE "InterviewTranscript"."id" = "InterviewTranscriptEntry"."interviewTranscriptId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own transcript qa pairs"
ON "InterviewTranscriptQaPair"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "InterviewTranscript"
        JOIN "Interview"
          ON "Interview"."id" = "InterviewTranscript"."interviewId"
        WHERE "InterviewTranscript"."id" = "InterviewTranscriptQaPair"."interviewTranscriptId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own interview timing metrics"
ON "InterviewTimingMetrics"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "Interview"
        WHERE "Interview"."id" = "InterviewTimingMetrics"."interviewId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own interview feedback"
ON "InterviewFeedback"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "Interview"
        WHERE "Interview"."id" = "InterviewFeedback"."interviewId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own interview face analyses"
ON "InterviewFaceAnalysis"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "Interview"
        WHERE "Interview"."id" = "InterviewFaceAnalysis"."interviewId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own coding challenge attempts"
ON "CodingChallengeAttempt"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "Interview"
        WHERE "Interview"."id" = "CodingChallengeAttempt"."interviewId"
          AND "Interview"."userId" = auth.uid()
    )
);

CREATE POLICY "Users can read own coding challenge evaluations"
ON "CodingChallengeEvaluation"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "CodingChallengeAttempt"
        JOIN "Interview"
          ON "Interview"."id" = "CodingChallengeAttempt"."interviewId"
        WHERE "CodingChallengeAttempt"."id" = "CodingChallengeEvaluation"."codingChallengeAttemptId"
          AND "Interview"."userId" = auth.uid()
    )
);


