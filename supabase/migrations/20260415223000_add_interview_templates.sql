-- AlterTable
ALTER TABLE "Interview"
ADD COLUMN "templateId" TEXT;

-- CreateTable
CREATE TABLE "InterviewTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "experience" TEXT NOT NULL DEFAULT '',
    "companySize" TEXT NOT NULL DEFAULT '',
    "interviewType" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestionLibrary" (
    "id" TEXT NOT NULL,
    "roleKey" TEXT,
    "isGeneral" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQuestionLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTemplateQuestion" (
    "id" UUID NOT NULL,
    "templateId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "priority" INTEGER,
    "textOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewTemplateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTemplateCodingChallenge" (
    "id" UUID NOT NULL,
    "templateId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewTemplateCodingChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTemplate_role_experience_companySize_interviewType_key"
ON "InterviewTemplate"("role", "experience", "companySize", "interviewType");

-- CreateIndex
CREATE INDEX "InterviewTemplate_isActive_sortOrder_idx"
ON "InterviewTemplate"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "InterviewTemplate_roleKey_isActive_sortOrder_idx"
ON "InterviewTemplate"("roleKey", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "InterviewQuestionLibrary_roleKey_isActive_priority_idx"
ON "InterviewQuestionLibrary"("roleKey", "isActive", "priority");

-- CreateIndex
CREATE INDEX "InterviewQuestionLibrary_isGeneral_isActive_priority_idx"
ON "InterviewQuestionLibrary"("isGeneral", "isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTemplateQuestion_templateId_sequence_key"
ON "InterviewTemplateQuestion"("templateId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTemplateQuestion_templateId_questionId_key"
ON "InterviewTemplateQuestion"("templateId", "questionId");

-- CreateIndex
CREATE INDEX "InterviewTemplateQuestion_templateId_priority_idx"
ON "InterviewTemplateQuestion"("templateId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTemplateCodingChallenge_templateId_sequence_key"
ON "InterviewTemplateCodingChallenge"("templateId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTemplateCodingChallenge_templateId_taskId_key"
ON "InterviewTemplateCodingChallenge"("templateId", "taskId");

-- CreateIndex
CREATE INDEX "InterviewTemplateCodingChallenge_taskId_idx"
ON "InterviewTemplateCodingChallenge"("taskId");

-- CreateIndex
CREATE INDEX "Interview_templateId_idx"
ON "Interview"("templateId");

-- AddForeignKey
ALTER TABLE "Interview"
ADD CONSTRAINT "Interview_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "InterviewTemplate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTemplateQuestion"
ADD CONSTRAINT "InterviewTemplateQuestion_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "InterviewTemplate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTemplateQuestion"
ADD CONSTRAINT "InterviewTemplateQuestion_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "InterviewQuestionLibrary"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTemplateCodingChallenge"
ADD CONSTRAINT "InterviewTemplateCodingChallenge_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "InterviewTemplate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTemplateCodingChallenge"
ADD CONSTRAINT "InterviewTemplateCodingChallenge_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "CodingChallengeTask"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security
ALTER TABLE "InterviewTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewQuestionLibrary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewTemplateQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewTemplateCodingChallenge" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read interview templates"
ON "InterviewTemplate"
FOR SELECT
TO authenticated
USING ("isActive" = true);

CREATE POLICY "Authenticated users can read interview question library"
ON "InterviewQuestionLibrary"
FOR SELECT
TO authenticated
USING ("isActive" = true);

CREATE POLICY "Authenticated users can read template questions"
ON "InterviewTemplateQuestion"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "InterviewTemplate"
        WHERE "InterviewTemplate"."id" = "InterviewTemplateQuestion"."templateId"
          AND "InterviewTemplate"."isActive" = true
    )
);

CREATE POLICY "Authenticated users can read template coding challenges"
ON "InterviewTemplateCodingChallenge"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "InterviewTemplate"
        WHERE "InterviewTemplate"."id" = "InterviewTemplateCodingChallenge"."templateId"
          AND "InterviewTemplate"."isActive" = true
    )
);
