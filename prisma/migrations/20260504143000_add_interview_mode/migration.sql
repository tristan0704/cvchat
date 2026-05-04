CREATE TYPE "InterviewMode" AS ENUM ('voice', 'face');

ALTER TABLE "Interview" ADD COLUMN "interviewMode" "InterviewMode";
