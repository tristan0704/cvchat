import "server-only";

import type {
  CodingChallengeEvaluation,
  CodingChallengeEvaluationDimension,
  CodingChallengeTask,
} from "@/lib/coding-challenge/types";
import { callOpenAiChat } from "@/lib/openai";

const FALLBACK_FEEDBACK = "Unable to analyze submission.";

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

function parseDimension(value: unknown): CodingChallengeEvaluationDimension {
  if (!value || typeof value !== "object") {
    return {
      score: 50,
      feedback: FALLBACK_FEEDBACK,
    };
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

function buildPrompt(task: CodingChallengeTask, code: string) {
  return {
    prompt: [
      "You are a senior technical interviewer reviewing a candidate coding challenge submission.",
      "Evaluate the candidate against the actual task, explicit requirements, evaluation focus, and hidden reference solution.",
      "Prioritize correctness first, then code quality and problem solving.",
      "Assume no code execution is available. Judge by static analysis only.",
      "Return only valid JSON with no markdown and no extra explanation.",
      "Do not mention the hidden reference solution directly in the feedback.",
    ].join(" "),
    question: [
      `Task name: ${task.name}`,
      `Role: ${task.role}`,
      `Language: ${task.language}`,
      `Difficulty: ${task.difficulty}`,
      "",
      "Description:",
      task.description,
      "",
      "Task statement:",
      task.statement,
      "",
      "Requirements:",
      ...task.requirements.map((requirement) => `- ${requirement}`),
      "",
      "Examples:",
      ...(task.examples.length > 0
        ? task.examples.map((example) => `- ${example}`)
        : ["- No examples provided"]),
      "",
      "Evaluation focus:",
      ...task.evaluationFocus.map((focus) => `- ${focus}`),
      "",
      "Hidden reference approach:",
      task.solution.approach,
      "",
      "Hidden reference solution:",
      task.solution.code,
      "",
      "Candidate submission:",
      code,
      "",
      "Return JSON in this exact format:",
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
      "Rules:",
      "- Be concise and concrete.",
      "- Reflect incomplete or incorrect logic clearly.",
      "- Do not hallucinate runtime behavior you cannot infer from the code.",
      "- Keep strengths, issues, and improvements actionable.",
    ].join("\n"),
  };
}

export async function evaluateCodingChallengeSubmission(
  task: CodingChallengeTask,
  code: string
): Promise<CodingChallengeEvaluation> {
  const { prompt, question } = buildPrompt(task, code);

  const ai = await callOpenAiChat({
    prompt,
    question,
    temperature: 0,
    timeoutMs: 30_000,
  });

  if (!ai.ok || !ai.content) {
    throw new Error(ai.error ?? "OpenAI evaluation failed");
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
        : FALLBACK_FEEDBACK,
    correctness: parseDimension(parsed.correctness),
    codeQuality: parseDimension(parsed.codeQuality),
    problemSolving: parseDimension(parsed.problemSolving),
    strengths: normalizeStringArray(parsed.strengths),
    issues: normalizeStringArray(parsed.issues),
    improvements: normalizeStringArray(parsed.improvements),
  };
}
