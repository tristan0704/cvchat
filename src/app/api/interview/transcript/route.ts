/**
 * Voice interview transcript endpoint.
 *
 * After the live call ends, the client uploads the recorded candidate audio to
 * this route. Gemini transcribes that single recording into the post-call
 * transcript shown in the UI and persisted for the feedback handoff.
 */

import { createPartFromUri, GoogleGenAI } from "@google/genai"
import { mapPostCallTranscriptToQaPairs } from "@/lib/post-call-qa-mapping"
import { normalizeTranscriptText, type TranscriptQaPair } from "@/lib/transcript"

export const runtime = "nodejs"

const PRIMARY_TRANSCRIPTION_MODEL = process.env.GEMINI_TRANSCRIPTION_MODEL || "gemini-2.5-flash"
const TRANSCRIPTION_MODEL_FALLBACKS = ["gemini-2.5-flash"]

function logTranscriptRouteError(stage: string, details: Record<string, unknown>) {
    console.error("[interview/transcript]", {
        stage,
        ...details,
    })
}

function parseInterviewerQuestions(rawValue: FormDataEntryValue | null): string[] {
    if (typeof rawValue !== "string" || !rawValue.trim()) return []

    try {
        const parsed = JSON.parse(rawValue) as unknown
        if (!Array.isArray(parsed)) return []

        return parsed
            .filter((value): value is string => typeof value === "string")
            .map((question) => normalizeTranscriptText(question))
            .filter((question) => !!question)
    } catch {
        return []
    }
}

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
        return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 })
    }

    const formData = await req.formData().catch(() => null)
    const audio = formData?.get("audio")
    const role = typeof formData?.get("role") === "string" ? String(formData.get("role")).trim() : "Backend Developer"
    const interviewerQuestions = parseInterviewerQuestions(formData?.get("interviewerQuestions") ?? null)

    if (!(audio instanceof File) || audio.size === 0) {
        return Response.json({ error: "Missing audio file" }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey })
    const uploadedFile = await ai.files
        .upload({
            file: audio,
            config: {
                mimeType: audio.type || "audio/webm",
            },
        })
        .catch((error) => {
            logTranscriptRouteError("upload", {
                role,
                audioType: audio.type || "audio/webm",
                audioSize: audio.size,
                message: error instanceof Error ? error.message : "Gemini file upload failed",
            })
            throw new Error(error instanceof Error ? error.message : "Gemini file upload failed")
        })

    try {
        if (!uploadedFile.uri || !uploadedFile.mimeType) {
            logTranscriptRouteError("upload_metadata", {
                role,
                uploadedFile,
            })
            return Response.json({ error: "Gemini file upload returned no usable file metadata" }, { status: 502 })
        }

        const modelsToTry = Array.from(new Set([PRIMARY_TRANSCRIPTION_MODEL, ...TRANSCRIPTION_MODEL_FALLBACKS]))
        let lastError = "Gemini transcription failed"

        for (const model of modelsToTry) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: [
                                        "Du transkribierst nur die Sprache des Kandidaten aus einem technischen Interview auf Deutsch.",
                                        `Die Zielrolle ist: ${role || "Backend Developer"}.`,
                                        "Liefere nur das bereinigte Transcript als fortlaufenden deutschen Text mit normaler Satzzeichensetzung.",
                                        "Keine Sprecherlabels. Keine Analyse. Keine Zusammenfassung. Kein Markdown.",
                                        "Wenn einzelne Woerter unklar sind, rekonstruiere konservativ und erfinde keine fachlichen Details hinzu.",
                                    ].join("\n"),
                                },
                                createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                            ],
                        },
                    ],
                })

                const transcriptText = response.text?.trim()
                if (!transcriptText) {
                    lastError = `Gemini returned no transcript text for model ${model}`
                    logTranscriptRouteError("transcribe_empty", {
                        role,
                        model,
                        interviewerQuestionCount: interviewerQuestions.length,
                    })
                    continue
                }

                let qaPairs: TranscriptQaPair[] = []
                let qaMappingModel = ""
                let qaMappingError = ""

                if (interviewerQuestions.length) {
                    try {
                        const qaMappingResult = await mapPostCallTranscriptToQaPairs({
                            ai,
                            role,
                            interviewerQuestions,
                            candidateTranscript: transcriptText,
                        })
                        qaPairs = qaMappingResult.qaPairs
                        qaMappingModel = qaMappingResult.model
                    } catch (error) {
                        qaMappingError = error instanceof Error ? error.message : "Gemini QA mapping failed"
                        logTranscriptRouteError("qa_mapping", {
                            role,
                            model,
                            interviewerQuestionCount: interviewerQuestions.length,
                            message: qaMappingError,
                        })
                    }
                }

                return Response.json({
                    transcriptText,
                    qaPairs,
                    qaMappingModel,
                    qaMappingError,
                    model,
                })
            } catch (error) {
                lastError = error instanceof Error ? error.message : `Gemini transcription failed for model ${model}`
                logTranscriptRouteError("transcribe", {
                    role,
                    model,
                    interviewerQuestionCount: interviewerQuestions.length,
                    audioType: audio.type || "audio/webm",
                    audioSize: audio.size,
                    message: lastError,
                })
            }
        }

        return Response.json({ error: lastError, stage: "transcribe" }, { status: 502 })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gemini transcription failed"
        logTranscriptRouteError("fatal", {
            role,
            interviewerQuestionCount: interviewerQuestions.length,
            audioType: audio.type || "audio/webm",
            audioSize: audio.size,
            message,
        })
        return Response.json({ error: message, stage: "fatal" }, { status: 502 })
    } finally {
        if (uploadedFile.name) {
            await ai.files.delete({ name: uploadedFile.name }).catch(() => undefined)
        }
    }
}
