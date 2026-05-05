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
import { normalizeLanguage } from "@/lib/i18n/dictionaries";

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
  language?: string;
};

type AnalyzeCvFeedbackFromTextArgs = {
  cvText: string;
  fileName: string;
  config: InterviewCvConfig;
  language?: string;
};

export async function analyzeCvFeedbackFromText({
  cvText,
  fileName,
  config,
  language = "de",
}: AnalyzeCvFeedbackFromTextArgs): Promise<CvFeedbackResult> {
  if (!cvText.trim()) {
    throw new CvFeedbackError(
      "Aus dem PDF konnte kein lesbarer Text extrahiert werden.",
      422
    );
  }

  const outputLanguage = normalizeLanguage(language);
  const roleProfile = buildRoleProfile(config);
  const roleAnalysis = analyzeKeywordMatch(cvText, roleProfile, outputLanguage);
  const llmQuality = await analyzeCvQualityWithLLM(cvText, config, outputLanguage);
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
  language = "de",
}: AnalyzeCvFeedbackArgs): Promise<CvFeedbackResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const cvText = await pdfToText(buffer);

  return analyzeCvFeedbackFromText({
    cvText,
    fileName: file.name,
    config,
    language,
  });
}
