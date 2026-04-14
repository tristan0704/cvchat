import { callOpenAiChat } from "@/lib/openai"
import type {
    InterviewFeedbackEvaluation,
    InterviewFeedbackEvaluationDimension,
    InterviewFeedbackRequest,
} from "@/lib/interview-feedback/types"

const FALLBACK_FEEDBACK = "Analyse nicht verfuegbar."

function clampScore(value: unknown) {
    const numeric = typeof value === "number" ? value : Number(value)

    if (Number.isNaN(numeric)) {
        return 50
    }

    if (numeric < 0) return 0
    if (numeric > 100) return 100

    return Math.round(numeric)
}

function normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) {
        return []
    }

    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
}

function parseDimension(
    value: unknown
): InterviewFeedbackEvaluationDimension {
    if (!value || typeof value !== "object") {
        return {
            score: 50,
            feedback: FALLBACK_FEEDBACK,
        }
    }

    const entry = value as Record<string, unknown>

    return {
        score: clampScore(entry.score),
        feedback:
            typeof entry.feedback === "string" && entry.feedback.trim().length > 0
                ? entry.feedback.trim()
                : FALLBACK_FEEDBACK,
    }
}

function extractJsonString(content: string) {
    const trimmed = content.trim()

    if (trimmed.startsWith("```")) {
        return trimmed
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim()
    }

    const objectStart = trimmed.indexOf("{")
    const objectEnd = trimmed.lastIndexOf("}")

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
        return trimmed.slice(objectStart, objectEnd + 1)
    }

    return trimmed
}

function buildPrompt(args: InterviewFeedbackRequest) {
    return {
        prompt: [
            "You are a senior interviewer evaluating a mock interview transcript for coaching feedback.",
            "Assess the candidate for the stated role and context only from the provided transcript.",
            "Prioritize clarity, answer quality, and role fit.",
            "Do not invent missing facts or claim certainty where the transcript is ambiguous.",
            "Write all feedback in German.",
            "Return only valid JSON with no markdown and no extra explanation.",
        ].join(" "),
        question: [
            `Rolle: ${args.role}`,
            `Erfahrung: ${args.experience?.trim() || "nicht angegeben"}`,
            `Unternehmensgroesse: ${args.companySize?.trim() || "nicht angegeben"}`,
            `Interview-Typ: ${args.interviewType?.trim() || "nicht angegeben"}`,
            `Transcript-Fingerprint: ${args.transcriptFingerprint}`,
            "",
            "Interview-Export:",
            args.transcript,
            "",
            "Return JSON in this exact format:",
            "{",
            '"overallScore": number (0-100),',
            '"passedLikely": boolean,',
            '"summary": string,',
            '"communication": { "score": number, "feedback": string },',
            '"answerQuality": { "score": number, "feedback": string },',
            '"roleFit": { "score": number, "feedback": string },',
            '"strengths": string[],',
            '"issues": string[],',
            '"improvements": string[]',
            "}",
            "",
            "Rules:",
            "- Be concise and concrete.",
            "- Keep strengths, issues, and improvements actionable.",
            "- Reflect weak or shallow answers clearly when the transcript shows them.",
            "- Avoid generic praise.",
            "- The summary should be 1 to 3 sentences.",
        ].join("\n"),
    }
}

export async function evaluateInterviewFeedback(
    args: InterviewFeedbackRequest
): Promise<InterviewFeedbackEvaluation> {
    const { prompt, question } = buildPrompt(args)

    const ai = await callOpenAiChat({
        prompt,
        question,
        temperature: 0,
        timeoutMs: 30_000,
    })

    if (!ai.ok || !ai.content) {
        throw new Error(ai.error ?? "OpenAI interview evaluation failed")
    }

    const parsed = JSON.parse(extractJsonString(ai.content)) as Record<
        string,
        unknown
    >

    return {
        analyzedAt: new Date().toISOString(),
        role: args.role,
        transcriptFingerprint: args.transcriptFingerprint,
        overallScore: clampScore(parsed.overallScore),
        passedLikely: Boolean(parsed.passedLikely),
        summary:
            typeof parsed.summary === "string" && parsed.summary.trim().length > 0
                ? parsed.summary.trim()
                : FALLBACK_FEEDBACK,
        communication: parseDimension(parsed.communication),
        answerQuality: parseDimension(parsed.answerQuality),
        roleFit: parseDimension(parsed.roleFit),
        strengths: normalizeStringArray(parsed.strengths),
        issues: normalizeStringArray(parsed.issues),
        improvements: normalizeStringArray(parsed.improvements),
    }
}
