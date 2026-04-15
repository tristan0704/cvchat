-- CreateTable
CREATE TABLE "InterviewOverallFeedback" (
    "id" UUID NOT NULL,
    "interviewId" UUID NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cvScore" INTEGER,
    "interviewScore" INTEGER,
    "codingChallengeScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewOverallFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewOverallFeedback_interviewId_key" ON "InterviewOverallFeedback"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewOverallFeedback_overallScore_analyzedAt_idx" ON "InterviewOverallFeedback"("overallScore", "analyzedAt");

-- AddForeignKey
ALTER TABLE "InterviewOverallFeedback" ADD CONSTRAINT "InterviewOverallFeedback_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security
ALTER TABLE "InterviewOverallFeedback" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own interview overall feedback"
ON "InterviewOverallFeedback"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "Interview"
        WHERE "Interview"."id" = "InterviewOverallFeedback"."interviewId"
          AND "Interview"."userId" = auth.uid()
    )
);
