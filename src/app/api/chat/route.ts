import { prisma } from "@/lib/prisma"
import { getChatPrompt } from "@/lib/prompts/chatPrompt"

export async function POST(req: Request) {
    const { token, question } = await req.json()

    if (!token || !question) {
        return Response.json(
            { error: "Missing token or question" },
            { status: 400 }
        )
    }

    const record = await prisma.cv.findUnique({
        where: { token },
    })

    if (!record) {
        return Response.json(
            { error: "CV not found" },
            { status: 404 }
        )
    }

    const prompt = getChatPrompt(record.data)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: question },
            ],
            temperature: 0,
        }),
    })

    const data = await response.json()

    const answer =
        data.choices?.[0]?.message?.content ??
        "Diese Information ist im Lebenslauf nicht enthalten."

    return Response.json({ answer })
}
