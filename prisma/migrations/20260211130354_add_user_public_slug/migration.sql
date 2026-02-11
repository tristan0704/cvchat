-- DropIndex
DROP INDEX "AppEvent_cvToken_createdAt_idx";

-- DropIndex
DROP INDEX "AppEvent_type_createdAt_idx";

-- AlterTable
ALTER TABLE "Cv" ALTER COLUMN "updatedAt" DROP DEFAULT;
