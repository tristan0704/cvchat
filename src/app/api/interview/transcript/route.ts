/**
 * Voice interview transcript endpoint.
 *
 * After the live call ends, the client uploads the recorded candidate audio to
 * this route. Gemini transcribes that single recording into the post-call
 * transcript shown in the UI and persisted for the feedback handoff.
 */

import {
    parseInterviewerQuestions,
    transcribeCandidateAudio,
    TranscriptServiceError,
} from "@/lib/interview-transcript/server/transcribe-candidate-audio"

export const runtime = "nodejs"

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

    try {
        const result = await transcribeCandidateAudio({
            apiKey,
            audio,
            role,
            interviewerQuestions,
        })

        return Response.json(result)
    } catch (error) {
        if (error instanceof TranscriptServiceError) {
            return Response.json(
                { error: error.message, stage: error.stage },
                { status: error.status }
            )
        }

        const message = error instanceof Error ? error.message : "Gemini transcription failed"
        return Response.json({ error: message, stage: "fatal" }, { status: 502 })
    }
}
