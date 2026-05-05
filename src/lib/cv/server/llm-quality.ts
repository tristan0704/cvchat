import "server-only";

import { callOpenAiChat } from "@/lib/openai";
import type { CvQualityAnalysis, InterviewCvConfig } from "@/lib/cv/types";
import { parseJsonObject } from "@/lib/cv/server/json";
import { normalizeLanguage } from "@/lib/i18n/dictionaries";

const FALLBACK_FEEDBACK = "Inhalt konnte nicht analysiert werden.";

export const FALLBACK_QUALITY_RESULT: CvQualityAnalysis = {
  overallScore: 50,
  sections: { score: 50, feedback: "Abschnitte konnten nicht analysiert werden." },
  impact: { score: 50, feedback: "Wirkung konnte nicht analysiert werden." },
  length: { score: 50, feedback: "Länge konnte nicht analysiert werden." },
  contact: { score: 50, feedback: "Kontaktinformationen konnten nicht analysiert werden." },
  clarity: { score: 50, feedback: "Klarheit konnte nicht analysiert werden." },
  improvements: ["Keine Analyse verfügbar."],
};

const FALLBACK_QUALITY_RESULT_EN: CvQualityAnalysis = {
  overallScore: 50,
  sections: { score: 50, feedback: "Sections could not be analyzed." },
  impact: { score: 50, feedback: "Impact could not be analyzed." },
  length: { score: 50, feedback: "Length could not be analyzed." },
  contact: { score: 50, feedback: "Contact information could not be analyzed." },
  clarity: { score: 50, feedback: "Clarity could not be analyzed." },
  improvements: ["No analysis available."],
};

function clampScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return 50;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return Math.round(numeric);
}

function getFallbackQualityResult(language: unknown) {
  return normalizeLanguage(language) === "en"
    ? FALLBACK_QUALITY_RESULT_EN
    : FALLBACK_QUALITY_RESULT;
}

function parseDimension(value: unknown, fallbackFeedback = FALLBACK_FEEDBACK) {
  if (!value || typeof value !== "object") {
    return { score: 50, feedback: fallbackFeedback };
  }

  const entry = value as Record<string, unknown>;
  return {
    score: clampScore(entry.score),
    feedback:
      typeof entry.feedback === "string" && entry.feedback.trim().length > 0
        ? entry.feedback.trim()
        : fallbackFeedback,
  };
}

function buildPrompt(cvText: string, config: InterviewCvConfig, language: unknown) {
  const outputLanguage = normalizeLanguage(language);
  const languageInstruction =
    outputLanguage === "en"
      ? "* Write all user-facing feedback in English."
      : "* Formuliere sämtliches Feedback auf Deutsch.";

  return {
    prompt: [
      "Du bist ein erfahrener Recruiter und Career Coach.",
      "Analysiere den gegebenen Lebenslauf für ein konkretes Interviewziel.",
      "Nutze semantisches Verständnis und keine reine Keyword-Zählung.",
      "Bewerte den Lebenslauf ganzheitlich für die ausgewählte Rolle und den gegebenen Kontext.",
      "Bewerte ausschließlich diese Dimensionen: sections, impact, length, contact, clarity.",
      "Antworte ausschließlich mit gültigem JSON ohne zusätzliche Erklärung.",
    ].join(" "),
    question: [
      "ZIELINTERVIEW:",
      `Rolle: ${config.role || "Unbekannt"}`,
      `Erfahrung: ${config.experience || "Nicht angegeben"}`,
      `Unternehmensgröße: ${config.companySize || "Nicht angegeben"}`,
      "",
      "INHALT DES LEBENSLAUFS:",
      cvText,
      "",
      "Gib JSON exakt in diesem Format zurück:",
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
      "Regeln:",
      languageInstruction,
      "* Begründe alles ausschließlich mit dem Inhalt des Lebenslaufs und dem Zielkontext.",
      "* Sei präzise, kurz und konkret umsetzbar.",
      "* Erfinde keine Erfahrungen, die im Lebenslauf nicht erkennbar sind.",
      "* Verbesserungen sollen der Kandidatin oder dem Kandidaten genau für dieses Interviewziel helfen.",
    ].join("\n"),
  };
}

export async function analyzeCvQualityWithLLM(
  cvText: string,
  config: InterviewCvConfig,
  language: unknown = "de"
): Promise<CvQualityAnalysis> {
  const fallbackQualityResult = getFallbackQualityResult(language);
  const trimmed = cvText.trim();
  if (!trimmed) {
    return fallbackQualityResult;
  }

  const { prompt, question } = buildPrompt(trimmed, config, language);

  try {
    const ai = await callOpenAiChat({
      prompt,
      question,
      temperature: 0,
      timeoutMs: 30_000,
    });

    if (!ai.ok || !ai.content) {
      console.warn("[cv-feedback] OpenAI call failed", ai.error);
      return fallbackQualityResult;
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
      sections: parseDimension(parsed.sections, fallbackQualityResult.sections.feedback),
      impact: parseDimension(parsed.impact, fallbackQualityResult.impact.feedback),
      length: parseDimension(parsed.length, fallbackQualityResult.length.feedback),
      contact: parseDimension(parsed.contact, fallbackQualityResult.contact.feedback),
      clarity: parseDimension(parsed.clarity, fallbackQualityResult.clarity.feedback),
      improvements:
        improvements.length > 0
          ? improvements
          : normalizeLanguage(language) === "en"
            ? ["No concrete improvements provided."]
            : ["Keine konkreten Verbesserungen angegeben."],
    };
  } catch (error) {
    console.error("[cv-feedback]", error);
    return fallbackQualityResult;
  }
}
