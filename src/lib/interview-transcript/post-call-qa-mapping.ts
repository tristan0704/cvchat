import { GoogleGenAI } from "@google/genai"
import { normalizeTranscriptText } from "@/lib/interview-transcript/text"
import type { TranscriptQaPair } from "@/lib/interview-transcript/types"

const PRIMARY_QA_MAPPING_MODEL = process.env.GEMINI_QA_MAPPING_MODEL || "gemini-2.5-flash"
const QA_MAPPING_MODEL_FALLBACKS = ["gemini-2.5-flash"]

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
}

function normalizeQuestions(interviewerQuestions: string[]): string[] {
    return interviewerQuestions
        .map((question) => normalizeTranscriptText(question))
        .filter((question) => !!question)
}

function buildQaMappingPrompt(role: string, interviewerQuestions: string[], candidateTranscript: string): string {
    const serializedQuestions = interviewerQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")

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

function buildAlignedQaPairs(interviewerQuestions: string[], answers: string[]): TranscriptQaPair[] {
    return interviewerQuestions.map((question, index) => ({
        question,
        answer: normalizeTranscriptText(answers[index] || "") || "(keine Antwort erfasst)",
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

    const modelsToTry = Array.from(new Set([PRIMARY_QA_MAPPING_MODEL, ...QA_MAPPING_MODEL_FALLBACKS]))
    let lastError = "Gemini QA mapping failed"

    for (const model of modelsToTry) {
        try {
            const response = await args.ai.models.generateContent({
                model,
                contents: buildQaMappingPrompt(args.role, interviewerQuestions, candidateTranscript),
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
                qaPairs: buildAlignedQaPairs(interviewerQuestions, answers),
                model,
            }
        } catch (error) {
            lastError = error instanceof Error ? error.message : `Gemini QA mapping failed for model ${model}`
        }
    }

    throw new Error(lastError)
}
