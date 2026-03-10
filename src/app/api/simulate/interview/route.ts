import { callOpenAiChat } from "@/lib/openai"

type InterviewBody = {
    role?: string
    question?: string
}

export async function POST(req: Request) {
    const body = (await req.json().catch(() => ({}))) as InterviewBody
    const role = body.role?.trim() || "Backend Developer"
    const question = body.question?.trim()

    if (!question) {
        return Response.json({ error: "Missing question" }, { status: 400 })
    }

    const prompt = [
        "You are an interviewer for junior and early-career candidates.",
        "Keep the interview realistic, concise, and supportive but direct.",
        `The target role is: ${role}.`,
        "Reply as an interviewer in 3 to 6 sentences.",
        "Evaluate the candidate's answer briefly and then ask exactly one strong follow-up question.",
    ].join("\n")

    const ai = await callOpenAiChat({
        prompt,
        question,
        timeoutMs: 20_000,
    })

    if (!ai.ok) {
        return Response.json({ error: "AI request failed" }, { status: 502 })
    }

    return Response.json({
        answer: ai.content,
    })
}
