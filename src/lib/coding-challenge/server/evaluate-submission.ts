import "server-only";

import type {
  CodingChallengeEvaluation,
  CodingChallengeEvaluationDimension,
  CodingChallengeTask,
} from "@/lib/coding-challenge/types";
import { callOpenAiChat } from "@/lib/openai";
import { normalizeLanguage } from "@/lib/i18n/dictionaries";

const FALLBACK_FEEDBACK = "Abgabe konnte nicht analysiert werden.";
const FALLBACK_FEEDBACK_EN = "Submission could not be analyzed.";

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(numeric)) {
    return 50;
  }

  if (numeric < 0) return 0;
  if (numeric > 100) return 100;

  return Math.round(numeric);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseDimension(
  value: unknown,
  fallbackFeedback = FALLBACK_FEEDBACK
): CodingChallengeEvaluationDimension {
  if (!value || typeof value !== "object") {
    return {
      score: 50,
      feedback: fallbackFeedback,
    };
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

function extractJsonString(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  return trimmed;
}

function getFallbackFeedback(language: unknown) {
  return normalizeLanguage(language) === "en"
    ? FALLBACK_FEEDBACK_EN
    : FALLBACK_FEEDBACK;
}

function buildPrompt(task: CodingChallengeTask, code: string, language: unknown) {
  const outputLanguage = normalizeLanguage(language);
  const languageInstruction =
    outputLanguage === "en"
      ? "Write all user-facing feedback in English."
      : "Formuliere sämtliches Feedback auf Deutsch.";

  return {
    prompt: [
      "Du bist ein erfahrener technischer Interviewer und bewertest die Abgabe einer Coding-Challenge.",
      "Bewerte die Kandidatin oder den Kandidaten anhand der tatsächlichen Aufgabe, der expliziten Anforderungen, des Bewertungsfokus und der versteckten Referenzlösung.",
      "Priorisiere zuerst Korrektheit, dann Code-Qualität und Problemlösung.",
      "Gehe davon aus, dass keine Codeausführung verfügbar ist. Beurteile nur per statischer Analyse.",
      "Gib ausschließlich gültiges JSON ohne Markdown und ohne zusätzliche Erklärung zurück.",
      "Erwähne die versteckte Referenzlösung nicht direkt im Feedback.",
      languageInstruction,
    ].join(" "),
    question: [
      `Aufgabenname: ${task.name}`,
      `Rolle: ${task.role}`,
      `Sprache: ${task.language}`,
      `Schwierigkeit: ${task.difficulty}`,
      "",
      "Beschreibung:",
      task.description,
      "",
      "Aufgabenstellung:",
      task.statement,
      "",
      "Anforderungen:",
      ...task.requirements.map((requirement) => `- ${requirement}`),
      "",
      "Beispiele:",
      ...(task.examples.length > 0
        ? task.examples.map((example) => `- ${example}`)
        : ["- Keine Beispiele angegeben"]),
      "",
      "Bewertungsfokus:",
      ...task.evaluationFocus.map((focus) => `- ${focus}`),
      "",
      "Versteckter Referenzansatz:",
      task.solution.approach,
      "",
      "Versteckte Referenzlösung:",
      task.solution.code,
      "",
      "Abgabe der Kandidatin oder des Kandidaten:",
      code,
      "",
      "Gib JSON exakt in diesem Format zurück:",
      "{",
      '"overallScore": number (0-100),',
      '"passedLikely": boolean,',
      '"summary": string,',
      '"correctness": { "score": number, "feedback": string },',
      '"codeQuality": { "score": number, "feedback": string },',
      '"problemSolving": { "score": number, "feedback": string },',
      '"strengths": string[],',
      '"issues": string[],',
      '"improvements": string[]',
      "}",
      "",
      "Regeln:",
      "- Sei kurz, konkret und technisch nachvollziehbar.",
      "- Benenne unvollständige oder fehlerhafte Logik klar.",
      "- Erfinde kein Laufzeitverhalten, das nicht aus dem Code ableitbar ist.",
      "- Halte Stärken, Probleme und Verbesserungen umsetzbar.",
    ].join("\n"),
  };
}

export async function evaluateCodingChallengeSubmission(
  task: CodingChallengeTask,
  code: string,
  language: unknown = "de"
): Promise<CodingChallengeEvaluation> {
  const { prompt, question } = buildPrompt(task, code, language);
  const fallbackFeedback = getFallbackFeedback(language);

  const ai = await callOpenAiChat({
    prompt,
    question,
    temperature: 0,
    timeoutMs: 30_000,
  });

  if (!ai.ok || !ai.content) {
    throw new Error(ai.error ?? "OpenAI-Bewertung fehlgeschlagen");
  }

  const parsed = JSON.parse(extractJsonString(ai.content)) as Record<
    string,
    unknown
  >;

  return {
    taskId: task.id,
    submittedAt: new Date().toISOString(),
    overallScore: clampScore(parsed.overallScore),
    passedLikely: Boolean(parsed.passedLikely),
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : fallbackFeedback,
    correctness: parseDimension(parsed.correctness, fallbackFeedback),
    codeQuality: parseDimension(parsed.codeQuality, fallbackFeedback),
    problemSolving: parseDimension(parsed.problemSolving, fallbackFeedback),
    strengths: normalizeStringArray(parsed.strengths),
    issues: normalizeStringArray(parsed.issues),
    improvements: normalizeStringArray(parsed.improvements),
  };
}
