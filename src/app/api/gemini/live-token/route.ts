import { createLiveInterviewToken } from "@/lib/voice-interview/server/live-token"

export const runtime = "nodejs"

type LiveTokenBody = {
    role?: string
}

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
        return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 })
    }

    const body = (await req.json().catch(() => ({}))) as LiveTokenBody
    const role = body.role?.trim() || "Backend-Entwickler"

    try {
        const token = await createLiveInterviewToken({ apiKey, role })
        return Response.json(token)
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gemini token creation failed"
        return Response.json({ error: message }, { status: 502 })
    }
}
