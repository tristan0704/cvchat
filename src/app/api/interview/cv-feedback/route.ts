import type { CvFeedbackResult, InterviewCvConfig } from "@/components/cv/types";
import {
  KEYWORD_WEIGHT,
  LLM_WEIGHT,
  MAX_CV_BYTES,
} from "@/app/api/interview/cv-feedback/constants";
import { buildRoleProfile } from "@/app/api/interview/cv-feedback/job-profile";
import { analyzeKeywordMatch } from "@/app/api/interview/cv-feedback/keyword-match";
import { analyzeCvQualityWithLLM } from "@/app/api/interview/cv-feedback/llm-quality";
import { pdfToText } from "@/app/api/interview/cv-feedback/pdf-to-text";

export const runtime = "nodejs";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return Response.json(
        { error: "PDF file must be application/pdf" },
        { status: 400 }
      );
    }

    if (file.size > MAX_CV_BYTES) {
      return Response.json(
        { error: "PDF must be smaller than 20MB" },
        { status: 400 }
      );
    }

    const config: InterviewCvConfig = {
      role: readString(formData, "role") || "Backend Developer",
      experience: readString(formData, "experience"),
      companySize: readString(formData, "companySize"),
      interviewType: readString(formData, "interviewType"),
    };

    const buffer = Buffer.from(await file.arrayBuffer());
    const cvText = await pdfToText(buffer);

    if (!cvText.trim()) {
      return Response.json(
        { error: "No readable text could be extracted from the PDF" },
        { status: 422 }
      );
    }

    const roleProfile = buildRoleProfile(config);
    const roleAnalysis = analyzeKeywordMatch(cvText, roleProfile);
    const llmQuality = await analyzeCvQualityWithLLM(cvText, config);
    const blendedScore = Math.round(
      llmQuality.overallScore * LLM_WEIGHT + roleAnalysis.score * KEYWORD_WEIGHT
    );

    const result: CvFeedbackResult = {
      fileName: file.name,
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

    return Response.json(result);
  } catch (error) {
    console.error("[api/interview/cv-feedback]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
