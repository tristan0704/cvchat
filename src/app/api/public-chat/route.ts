import { prisma } from "@/lib/prisma"
import { getChatPrompt } from "@/lib/prompts/chatPrompt"
import { buildStructuredChatContext } from "@/lib/profileContext"

type PublicChatBody = {
    publicSlug?: string
    question?: string
}

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => ({}))) as PublicChatBody
        const publicSlug = body.publicSlug?.trim().toLowerCase()
        const question = body.question?.trim()

        if (!publicSlug || !question) {
            return Response.json({ error: "Missing publicSlug or question" }, { status: 400 })
        }

        // Gleiche Datenbasis wie Public Profile:
        // Chat arbeitet immer auf dem zuletzt aktualisierten CV dieses Slugs.
        const user = await prisma.user.findUnique({
            where: { publicSlug },
            select: {
                cvs: {
                    orderBy: { updatedAt: "desc" },
                    take: 1,
                    select: {
                        token: true,
                        data: true,
                        meta: {
                            select: {
                                name: true,
                                position: true,
                                summary: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        })

        const cv = user?.cvs[0] as
            | {
            token: string
                data: unknown
                meta: { name: string; position: string; summary: string; imageUrl: string | null } | null
            }
            | undefined

        if (!cv || !cv.meta) {
            return Response.json({ error: "CV not found" }, { status: 404 })
        }

        // BAUSTELLE:
        // Projekt-Uploads sollen spaeter hier als weitere Evidenzquellen dazukommen.
        const certificates = await prisma.certificate.findMany({
            where: { cvToken: cv.token },
            select: { data: true },
        })
        const additionalText = await prisma.additionalText.findMany({
            where: { cvToken: cv.token },
            select: { content: true },
        })

        const context = buildStructuredChatContext({
            cvData: cv.data,
            meta: cv.meta,
            certificates: certificates.map((item) => item.data),
            additionalText: additionalText.map((item) => item.content),
        })
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

        return Response.json({ answer })
    } catch (err) {
        console.error("[api/public-chat]", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
