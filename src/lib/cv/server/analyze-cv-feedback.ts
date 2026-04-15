import "server-only";

import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";
import {
  KEYWORD_WEIGHT,
  LLM_WEIGHT,
} from "@/lib/cv/server/constants";
import { buildRoleProfile } from "@/lib/cv/server/job-profile";
import { analyzeKeywordMatch } from "@/lib/cv/server/keyword-match";
import { analyzeCvQualityWithLLM } from "@/lib/cv/server/llm-quality";
import { pdfToText } from "@/lib/cv/server/pdf-to-text";

export class CvFeedbackError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CvFeedbackError";
    this.status = status;
  }
}

type AnalyzeCvFeedbackArgs = {
  file: File;
  config: InterviewCvConfig;
};

type AnalyzeCvFeedbackFromTextArgs = {
  cvText: string;
  fileName: string;
  config: InterviewCvConfig;
};

export async function analyzeCvFeedbackFromText({
  cvText,
  fileName,
  config,
}: AnalyzeCvFeedbackFromTextArgs): Promise<CvFeedbackResult> {
  if (!cvText.trim()) {
    throw new CvFeedbackError(
      "No readable text could be extracted from the PDF",
      422
    );
  }

  const roleProfile = buildRoleProfile(config);
  const roleAnalysis = analyzeKeywordMatch(cvText, roleProfile);
  const llmQuality = await analyzeCvQualityWithLLM(cvText, config);
  const blendedScore = Math.round(
    llmQuality.overallScore * LLM_WEIGHT + roleAnalysis.score * KEYWORD_WEIGHT
  );

  return {
    fileName,
    analyzedAt: new Date().toISOString(),
    config,
    quality: {
      ...llmQuality,
      overallScore: blendedScore,
    },
    roleAnalysis,
    scoreBreakdown: {
      keywordScore: roleAnalysis.score,
      llmScore: llmQuality.overallScore,
      blendedScore,
      keywordWeight: KEYWORD_WEIGHT,
      llmWeight: LLM_WEIGHT,
    },
  };
}

export async function analyzeCvFeedback({
  file,
  config,
}: AnalyzeCvFeedbackArgs): Promise<CvFeedbackResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const cvText = await pdfToText(buffer);

  return analyzeCvFeedbackFromText({
    cvText,
    fileName: file.name,
    config,
  });
}
