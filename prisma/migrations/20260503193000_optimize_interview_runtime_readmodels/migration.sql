-- Interview-Runtime-Status liegt direkt auf "Interview", damit häufiges
-- Polling nur eine schmale, besitzgeprüfte Zeile liest. Die Detailtabellen
-- bleiben die fachliche Quelle für Inhalte.
ALTER TABLE "Interview"
ADD COLUMN IF NOT EXISTS "runtimeTranscriptStatus" "InterviewTranscriptStatus",
ADD COLUMN IF NOT EXISTS "runtimeTranscriptError" TEXT,
ADD COLUMN IF NOT EXISTS "hasCvFeedback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasInterviewFeedback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasOverallFeedback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasCodingEvaluation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "statusVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Interview" AS interview
SET
    "runtimeTranscriptStatus" = transcript."transcriptStatus",
    "runtimeTranscriptError" = transcript."transcriptError",
    "hasCvFeedback" = source."cvFeedbackAnalysisId" IS NOT NULL,
    "hasInterviewFeedback" = feedback."id" IS NOT NULL,
    "hasOverallFeedback" = overall_feedback."id" IS NOT NULL,
    "hasCodingEvaluation" = coding_evaluation."id" IS NOT NULL,
    "statusVersion" = GREATEST(interview."statusVersion", 1),
    "lastActivityAt" = GREATEST(
        source."updatedAt",
        COALESCE(transcript."updatedAt", source."updatedAt"),
        COALESCE(feedback."updatedAt", source."updatedAt"),
        COALESCE(overall_feedback."updatedAt", source."updatedAt"),
        COALESCE(coding_evaluation."updatedAt", source."updatedAt")
    )
FROM "Interview" AS source
LEFT JOIN "InterviewTranscript" AS transcript
    ON transcript."interviewId" = source."id"
LEFT JOIN "InterviewFeedback" AS feedback
    ON feedback."interviewId" = source."id"
LEFT JOIN "InterviewOverallFeedback" AS overall_feedback
    ON overall_feedback."interviewId" = source."id"
LEFT JOIN LATERAL (
    SELECT evaluation."id", evaluation."updatedAt"
    FROM "CodingChallengeAttempt" AS attempt
    JOIN "CodingChallengeEvaluation" AS evaluation
        ON evaluation."codingChallengeAttemptId" = attempt."id"
    WHERE attempt."interviewId" = source."id"
    ORDER BY attempt."attemptNumber" DESC
    LIMIT 1
) AS coding_evaluation ON true
WHERE interview."id" = source."id";

-- Diese Spalten waren als Storage-Metadaten vorgesehen, werden aber im Code
-- nicht befüllt. Der Drop reduziert Datenmodell-Rauschen und Prisma-Drift.
ALTER TABLE "Interview"
DROP COLUMN IF EXISTS "archivedAt";

ALTER TABLE "InterviewTranscript"
DROP COLUMN IF EXISTS "candidateAudioBucket",
DROP COLUMN IF EXISTS "candidateAudioPath",
DROP COLUMN IF EXISTS "candidateAudioMimeType",
DROP COLUMN IF EXISTS "candidateAudioBytes",
DROP COLUMN IF EXISTS "recapAudioBucket",
DROP COLUMN IF EXISTS "recapAudioPath",
DROP COLUMN IF EXISTS "recapAudioMimeType",
DROP COLUMN IF EXISTS "recapAudioBytes";

ALTER TABLE "InterviewFaceAnalysis"
DROP COLUMN IF EXISTS "sourceBucket",
DROP COLUMN IF EXISTS "sourcePath";

-- Advisor-Drops nur dort, wo das finale Prisma-Schema den Index ebenfalls
-- entfernt. "InterviewFeedback_role_analyzedAt_idx" bleibt absichtlich erhalten.
DROP INDEX IF EXISTS "CvVersion_userId_isActive_idx";
DROP INDEX IF EXISTS "CvFeedbackAnalysis_cvVersionId_analyzedAt_idx";
DROP INDEX IF EXISTS "CvFeedbackAnalysis_role_analyzedAt_idx";
DROP INDEX IF EXISTS "InterviewPlannedQuestion_interviewId_priority_idx";
DROP INDEX IF EXISTS "InterviewTranscript_transcriptFingerprint_idx";
DROP INDEX IF EXISTS "InterviewTranscriptEntry_interviewTranscriptId_speaker_idx";
DROP INDEX IF EXISTS "InterviewFeedback_transcriptFingerprint_idx";
DROP INDEX IF EXISTS "InterviewFaceAnalysis_overallStatus_analyzedAt_idx";
DROP INDEX IF EXISTS "InterviewFaceAnalysis_overallScore_analyzedAt_idx";
DROP INDEX IF EXISTS "CodingChallengeAttempt_interviewId_selectedAt_idx";
DROP INDEX IF EXISTS "CodingChallengeAttempt_taskId_status_idx";
DROP INDEX IF EXISTS "CodingChallengeEvaluation_taskId_submittedAt_idx";
DROP INDEX IF EXISTS "CodingChallengeEvaluation_overallScore_submittedAt_idx";
DROP INDEX IF EXISTS "InterviewOverallFeedback_overallScore_analyzedAt_idx";

CREATE INDEX IF NOT EXISTS "CodingChallengeAttempt_taskId_idx"
ON "CodingChallengeAttempt"("taskId");
