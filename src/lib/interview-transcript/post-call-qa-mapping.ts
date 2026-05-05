import { GoogleGenAI } from "@google/genai"
import { normalizeLanguage } from "@/lib/i18n/dictionaries"
import { normalizeTranscriptText } from "@/lib/interview-transcript/text"
import type { TranscriptQaPair } from "@/lib/interview-transcript/types"

const PRIMARY_QA_MAPPING_MODEL = process.env.GEMINI_QA_MAPPING_MODEL || "models/gemini-2.5-flash"
const QA_MAPPING_MODEL_FALLBACKS = ["models/gemini-2.5-flash"]

const QA_MAPPING_RESPONSE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["answers"],
    properties: {
        answers: {
            type: "array",
            items: {
                type: "string",
            },
        },
    },
}

type QaMappingResponse = {
    answers?: string[]
}

type MapPostCallTranscriptToQaPairsArgs = {
    ai: GoogleGenAI
    role: string
    interviewerQuestions: string[]
    candidateTranscript: string
    language?: string
}

function normalizeModelName(model: string): string {
    const normalized = model.trim()
    if (!normalized) return "models/gemini-2.5-flash"
    if (
        normalized.startsWith("models/") ||
        normalized.startsWith("publishers/") ||
        normalized.startsWith("projects/")
    ) {
        return normalized
    }

    return `models/${normalized}`
}

function normalizeQuestions(interviewerQuestions: string[]): string[] {
    return interviewerQuestions
        .map((question) => normalizeTranscriptText(question))
        .filter((question) => !!question)
}

function buildQaMappingPrompt(role: string, interviewerQuestions: string[], candidateTranscript: string, language: unknown): string {
    const serializedQuestions = interviewerQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")
    const outputLanguage = normalizeLanguage(language)

    //Gemini Prompt für QA Mapping

    if (outputLanguage === "en") {
        return [
            "For an English technical interview, match each recruiter question to the most suitable candidate answer.",
            `The target role is: ${role || "Backend Developer"}.`,
            "You receive the questions in the exact order they were asked and the complete post-call candidate transcript.",
            "Return exactly one JSON object with the field answers.",
            `answers must contain exactly ${interviewerQuestions.length} entries, in the same order as the questions.`,
            "Use only content from the candidate transcript.",
            "Do not invent answer parts, new questions, or evaluations.",
            "If an answer cannot be matched confidently, return an empty string for that entry.",
            "Questions:",
            serializedQuestions,
            "",
            "Candidate full transcript:",
            candidateTranscript,
        ].join("\n")
    }

    return [
        "Ordne fuer ein deutsches technisches Interview jede gestellte Recruiter-Frage der passendsten Kandidatenantwort zu.",
        `Die Zielrolle ist: ${role || "Backend Developer"}.`,
        "Du bekommst die Fragen in der exakten Reihenfolge, in der sie gestellt wurden, und das komplette Post-Call-Transcript des Kandidaten.",
        "Gib exakt ein JSON-Objekt mit dem Feld answers zurueck.",
        `answers muss genau ${interviewerQuestions.length} Eintraege haben, in derselben Reihenfolge wie die Fragen.`,
        "Nutze nur Inhalt aus dem Kandidaten-Transcript.",
        "Erfinde keine Antwortteile, keine neuen Fragen und keine Bewertungen.",
        "Wenn eine Antwort nicht sicher zuordenbar ist, gib fuer diesen Eintrag einen leeren String zurueck.",
        "Fragen:",
        serializedQuestions,
        "",
        "Kandidaten-Volltranskript:",
        candidateTranscript,
    ].join("\n")
}

function parseQaMappingResponse(responseText: string): string[] {
    const parsed = JSON.parse(responseText) as QaMappingResponse
    return Array.isArray(parsed.answers) ? parsed.answers.filter((answer) => typeof answer === "string") : []
}

function buildAlignedQaPairs(interviewerQuestions: string[], answers: string[], language: unknown): TranscriptQaPair[] {
    const fallbackAnswer =
        normalizeLanguage(language) === "en"
            ? "(no answer captured)"
            : "(keine Antwort erfasst)"

    return interviewerQuestions.map((question, index) => ({
        question,
        answer: normalizeTranscriptText(answers[index] || "") || fallbackAnswer,
    }))
}

export async function mapPostCallTranscriptToQaPairs(args: MapPostCallTranscriptToQaPairsArgs): Promise<{ qaPairs: TranscriptQaPair[]; model: string }> {
    const interviewerQuestions = normalizeQuestions(args.interviewerQuestions)
    const candidateTranscript = normalizeTranscriptText(args.candidateTranscript)

    if (!interviewerQuestions.length || !candidateTranscript) {
        return {
            qaPairs: [],
            model: "",
        }
    }

    const modelsToTry = Array.from(
        new Set([PRIMARY_QA_MAPPING_MODEL, ...QA_MAPPING_MODEL_FALLBACKS].map(normalizeModelName))
    )
    let lastError = "Gemini QA mapping failed"

    for (const model of modelsToTry) {
        try {
            const response = await args.ai.models.generateContent({
                model,
                contents: buildQaMappingPrompt(args.role, interviewerQuestions, candidateTranscript, args.language),
                config: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    responseJsonSchema: QA_MAPPING_RESPONSE_SCHEMA,
                },
            })

            const responseText = response.text?.trim()
            if (!responseText) {
                lastError = `Gemini returned no QA mapping text for model ${model}`
                continue
            }

            const answers = parseQaMappingResponse(responseText)
            return {
                qaPairs: buildAlignedQaPairs(interviewerQuestions, answers, args.language),
                model,
            }
        } catch (error) {
            lastError = error instanceof Error ? error.message : `Gemini QA mapping failed for model ${model}`
        }
    }

    throw new Error(lastError)
}
