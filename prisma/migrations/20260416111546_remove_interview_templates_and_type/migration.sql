-- DropForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT "Interview_templateId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewTemplateCodingChallenge" DROP CONSTRAINT "InterviewTemplateCodingChallenge_taskId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewTemplateCodingChallenge" DROP CONSTRAINT "InterviewTemplateCodingChallenge_templateId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewTemplateQuestion" DROP CONSTRAINT "InterviewTemplateQuestion_questionId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewTemplateQuestion" DROP CONSTRAINT "InterviewTemplateQuestion_templateId_fkey";

-- DropIndex
DROP INDEX "CvFeedbackAnalysis_cvVersionId_role_experience_companySize__key";

-- DropIndex
DROP INDEX "Interview_templateId_idx";

-- AlterTable
ALTER TABLE "CvFeedbackAnalysis" DROP COLUMN "interviewType";

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "interviewType",
DROP COLUMN "templateId";

-- DropPolicy
DROP POLICY IF EXISTS "Authenticated users can read interview templates" ON "InterviewTemplate";

-- DropPolicy
DROP POLICY IF EXISTS "Authenticated users can read interview question library" ON "InterviewQuestionLibrary";

-- DropPolicy
DROP POLICY IF EXISTS "Authenticated users can read template questions" ON "InterviewTemplateQuestion";

-- DropPolicy
DROP POLICY IF EXISTS "Authenticated users can read template coding challenges" ON "InterviewTemplateCodingChallenge";

-- DropTable
DROP TABLE "InterviewQuestionLibrary";

-- DropTable
DROP TABLE "InterviewTemplate";

-- DropTable
DROP TABLE "InterviewTemplateCodingChallenge";

-- DropTable
DROP TABLE "InterviewTemplateQuestion";

-- CreateIndex
CREATE UNIQUE INDEX "CvFeedbackAnalysis_cvVersionId_role_experience_companySize_key" ON "CvFeedbackAnalysis"("cvVersionId", "role", "experience", "companySize");


