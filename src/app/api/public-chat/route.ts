import { prisma } from "@/lib/prisma"
import { getChatPrompt } from "@/lib/prompts/chatPrompt"
import { PublishedSnapshot } from "@/lib/cvPublishing"
import { captureServerError, trackEvent } from "@/lib/observability"

type PublicChatBody = {
    shareToken?: string
    question?: string
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => ({}))) as PublicChatBody
        const shareToken = body.shareToken?.trim()
        const question = body.question?.trim()

        if (!shareToken || !question) {
            return Response.json(
                { error: "Missing shareToken or question" },
                { status: 400 }
            )
        }

        const cv = await prisma.cv.findUnique({
            where: { shareToken },
            select: {
                token: true,
                isPublished: true,
                shareEnabled: true,
                publishedData: true,
            },
        })

        if (!cv || !cv.isPublished || !cv.shareEnabled || !cv.publishedData) {
            return Response.json({ error: "CV not found" }, { status: 404 })
        }

        const snapshot = cv.publishedData as PublishedSnapshot
        const context = {
            cv: snapshot.cv,
            certificates: snapshot.certificates,
            references: snapshot.references,
            additionalText: snapshot.additionalText,
        }
        const prompt = getChatPrompt(context)

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
            "Diese Information ist in den Unterlagen nicht enthalten."

        await trackEvent({
            type: "public_question_asked",
            cvToken: cv.token,
            context: { questionLength: question.length },
        })

        return Response.json({ answer })
    } catch (err) {
        await captureServerError("api/public-chat", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
