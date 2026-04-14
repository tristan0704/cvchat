import "server-only";

import { callOpenAiChat } from "@/lib/openai";
import type { CvQualityAnalysis, InterviewCvConfig } from "@/lib/cv/types";
import { parseJsonObject } from "@/lib/cv/server/json";

const FALLBACK_FEEDBACK = "Unable to analyze content.";

export const FALLBACK_QUALITY_RESULT: CvQualityAnalysis = {
  overallScore: 50,
  sections: { score: 50, feedback: "Unable to analyze sections." },
  impact: { score: 50, feedback: "Unable to analyze impact." },
  length: { score: 50, feedback: "Unable to analyze length." },
  contact: { score: 50, feedback: "Unable to analyze contact info." },
  clarity: { score: 50, feedback: "Unable to analyze clarity." },
  improvements: ["Analysis unavailable"],
};

function clampScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return 50;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return Math.round(numeric);
}

function parseDimension(value: unknown) {
  if (!value || typeof value !== "object") {
    return { score: 50, feedback: FALLBACK_FEEDBACK };
  }

  const entry = value as Record<string, unknown>;
  return {
    score: clampScore(entry.score),
    feedback:
      typeof entry.feedback === "string" && entry.feedback.trim().length > 0
        ? entry.feedback.trim()
        : FALLBACK_FEEDBACK,
  };
}

function buildPrompt(cvText: string, config: InterviewCvConfig) {
  return {
    prompt: [
      "You are an experienced recruiter and career coach.",
      "Analyze the given CV for a specific interview target.",
      "Use semantic understanding, not exact keyword counting.",
      "Evaluate the CV holistically for the selected role and context.",
      "Score these dimensions only: sections, impact, length, contact, clarity.",
      "Return ONLY valid JSON with no explanation.",
    ].join(" "),
    question: [
      "TARGET INTERVIEW:",
      `Role: ${config.role || "Unknown"}`,
      `Experience: ${config.experience || "Not specified"}`,
      `Company size: ${config.companySize || "Not specified"}`,
      `Interview type: ${config.interviewType || "Not specified"}`,
      "",
      "CV CONTENT:",
      cvText,
      "",
      "Return JSON in this exact format:",
      "{",
      '"overallScore": number (0-100),',
      '"sections": { "score": number, "feedback": string },',
      '"impact": { "score": number, "feedback": string },',
      '"length": { "score": number, "feedback": string },',
      '"contact": { "score": number, "feedback": string },',
      '"clarity": { "score": number, "feedback": string },',
      '"improvements": string[]',
      "}",
      "",
      "Rules:",
      "* Base the feedback on the CV content and the target interview context.",
      "* Be concise and actionable.",
      "* Do not hallucinate experience that is not visible in the CV.",
      "* Improvements should help the candidate for this exact interview target.",
    ].join("\n"),
  };
}

export async function analyzeCvQualityWithLLM(
  cvText: string,
  config: InterviewCvConfig
): Promise<CvQualityAnalysis> {
  const trimmed = cvText.trim();
  if (!trimmed) {
    return FALLBACK_QUALITY_RESULT;
  }

  const { prompt, question } = buildPrompt(trimmed, config);

  try {
    const ai = await callOpenAiChat({
      prompt,
      question,
      temperature: 0,
      timeoutMs: 30_000,
    });

    if (!ai.ok || !ai.content) {
      console.warn("[cv-feedback] OpenAI call failed", ai.error);
      return FALLBACK_QUALITY_RESULT;
    }

    const parsed = parseJsonObject<Record<string, unknown>>(ai.content);

    const improvements = Array.isArray(parsed.improvements)
      ? parsed.improvements
          .filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
          .map((item) => item.trim())
      : [];

    return {
      overallScore: clampScore(parsed.overallScore),
      sections: parseDimension(parsed.sections),
      impact: parseDimension(parsed.impact),
      length: parseDimension(parsed.length),
      contact: parseDimension(parsed.contact),
      clarity: parseDimension(parsed.clarity),
      improvements:
        improvements.length > 0
          ? improvements
          : ["No specific improvements provided."],
    };
  } catch (error) {
    console.error("[cv-feedback]", error);
    return FALLBACK_QUALITY_RESULT;
  }
}
