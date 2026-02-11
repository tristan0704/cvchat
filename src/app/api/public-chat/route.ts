import { prisma } from "@/lib/prisma"
import { getChatPrompt } from "@/lib/prompts/chatPrompt"
import { PublishedSnapshot } from "@/lib/cvPublishing"
import { buildStructuredChatContext } from "@/lib/profileContext"
import { captureServerError, trackEvent } from "@/lib/observability"

type PublicChatBody = {
    publicSlug?: string
    shareToken?: string
    question?: string
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => ({}))) as PublicChatBody
        const publicSlug = body.publicSlug?.trim().toLowerCase()
        const shareToken = body.shareToken?.trim()
        const question = body.question?.trim()

        if ((!publicSlug && !shareToken) || !question) {
            return Response.json(
                { error: "Missing publicSlug/shareToken or question" },
                { status: 400 }
            )
        }

        let cv: {
            token: string
            isPublished: boolean
            shareEnabled: boolean
            publishedData: unknown
        } | null = null

        if (publicSlug) {
            const user = await prisma.user.findUnique({
                where: { publicSlug },
                select: {
                    cvs: {
                        where: {
                            isPublished: true,
                            shareEnabled: true,
                        },
                        orderBy: { publishedAt: "desc" },
                        take: 1,
                        select: {
                            token: true,
                            isPublished: true,
                            shareEnabled: true,
                            publishedData: true,
                        },
                    },
                },
            })
            cv = user?.cvs[0] ?? null
        } else if (shareToken) {
            cv = await prisma.cv.findUnique({
                where: { shareToken },
                select: {
                    token: true,
                    isPublished: true,
                    shareEnabled: true,
                    publishedData: true,
                },
            })
        }

        if (!cv || !cv.isPublished || !cv.shareEnabled || !cv.publishedData) {
            return Response.json({ error: "CV not found" }, { status: 404 })
        }

        const snapshot = cv.publishedData as PublishedSnapshot
        const context = buildStructuredChatContext(snapshot)
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
