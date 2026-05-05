import { callOpenAiChat } from "@/lib/openai"
import type {
    InterviewFeedbackEvaluation,
    InterviewFeedbackEvaluationDimension,
    InterviewFeedbackRequest,
} from "@/lib/interview-feedback-fetch/types"
import { normalizeLanguage } from "@/lib/i18n/dictionaries"

const FALLBACK_FEEDBACK = "Analyse nicht verfügbar."
const FALLBACK_FEEDBACK_EN = "Analysis unavailable."

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
    value: unknown,
    fallbackFeedback = FALLBACK_FEEDBACK
): InterviewFeedbackEvaluationDimension {
    if (!value || typeof value !== "object") {
        return {
            score: 50,
            feedback: fallbackFeedback,
        }
    }

    const entry = value as Record<string, unknown>

    return {
        score: clampScore(entry.score),
        feedback:
            typeof entry.feedback === "string" && entry.feedback.trim().length > 0
                ? entry.feedback.trim()
                : fallbackFeedback,
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

function getFeedbackFallback(language: unknown) {
    return normalizeLanguage(language) === "en"
        ? FALLBACK_FEEDBACK_EN
        : FALLBACK_FEEDBACK
}

function buildLanguageAwareFingerprint(
    transcriptFingerprint: string,
    language: unknown
) {
    return `${transcriptFingerprint}:${normalizeLanguage(language)}`
}

function buildPrompt(args: InterviewFeedbackRequest) {
    const outputLanguage = normalizeLanguage(args.language)
    const languageInstruction =
        outputLanguage === "en"
            ? "Write all user-facing feedback in English."
            : "Formuliere sämtliches Feedback auf Deutsch."

    return {
        prompt: [
            "Du bist ein erfahrener technischer Interviewer und bewertest das Transkript eines Mock-Interviews für Coaching-Feedback.",
            "Bewerte die Kandidatin oder den Kandidaten nur auf Basis des bereitgestellten Transkripts für die angegebene Rolle und den Kontext.",
            "Priorisiere Klarheit, Antwortqualität und Rollenfit.",
            "Erfinde keine fehlenden Fakten und behaupte keine Sicherheit, wenn das Transkript mehrdeutig ist.",
            languageInstruction,
            "Gib ausschließlich gültiges JSON ohne Markdown und ohne zusätzliche Erklärung zurück.",
        ].join(" "),
        question: [
            `Rolle: ${args.role}`,
            `Erfahrung: ${args.experience?.trim() || "nicht angegeben"}`,
            `Unternehmensgröße: ${args.companySize?.trim() || "nicht angegeben"}`,
            `Transkript-Fingerprint: ${args.transcriptFingerprint}`,
            "",
            "Interview-Export:",
            args.transcript,
            "",
            "Gib JSON exakt in diesem Format zurück:",
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
            "Regeln:",
            "- Sei kurz, konkret und nachvollziehbar.",
            "- Halte Stärken, Probleme und Verbesserungen umsetzbar.",
            "- Benenne schwache oder oberflächliche Antworten klar, wenn das Transkript sie zeigt.",
            "- Vermeide generisches Lob.",
            "- Die Zusammenfassung soll 1 bis 3 Sätze lang sein.",
        ].join("\n"),
    }
}

export async function evaluateInterviewFeedback(
    args: InterviewFeedbackRequest
): Promise<InterviewFeedbackEvaluation> {
    const { prompt, question } = buildPrompt(args)
    const fallbackFeedback = getFeedbackFallback(args.language)

    const ai = await callOpenAiChat({
        prompt,
        question,
        temperature: 0,
        timeoutMs: 30_000,
    })

    if (!ai.ok || !ai.content) {
        throw new Error(ai.error ?? "OpenAI-Interviewbewertung fehlgeschlagen")
    }

    const parsed = JSON.parse(extractJsonString(ai.content)) as Record<
        string,
        unknown
    >

    return {
        analyzedAt: new Date().toISOString(),
        role: args.role,
        transcriptFingerprint: buildLanguageAwareFingerprint(
            args.transcriptFingerprint,
            args.language
        ),
        overallScore: clampScore(parsed.overallScore),
        passedLikely: Boolean(parsed.passedLikely),
        summary:
            typeof parsed.summary === "string" && parsed.summary.trim().length > 0
                ? parsed.summary.trim()
                : fallbackFeedback,
        communication: parseDimension(parsed.communication, fallbackFeedback),
        answerQuality: parseDimension(parsed.answerQuality, fallbackFeedback),
        roleFit: parseDimension(parsed.roleFit, fallbackFeedback),
        strengths: normalizeStringArray(parsed.strengths),
        issues: normalizeStringArray(parsed.issues),
        improvements: normalizeStringArray(parsed.improvements),
    }
}
