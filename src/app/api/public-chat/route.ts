// DATEIUEBERSICHT: API-Route fuer oeffentlichen Chat auf Basis des freigegebenen Profils.
import { prisma } from "@/lib/prisma"
import { getChatPrompt } from "@/lib/prompts/chatPrompt"
import { buildStructuredChatContext } from "@/lib/profileContext"
import { callOpenAiChat } from "@/lib/openai"
import { enforceRateLimit } from "@/lib/securityRateLimit"

type PublicChatBody = {
    publicSlug?: string
    question?: string
}

export async function POST(req: Request) {
    try {
        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        const limited = enforceRateLimit(req, "public-chat", {
            windowMs: 60_000,
            max: 120,
        })
        if (limited) return limited

        const body = (await req.json().catch(() => ({}))) as PublicChatBody
        const publicSlug = body.publicSlug?.trim().toLowerCase()
        const question = body.question?.trim()

        if (!publicSlug || !question) {
            return Response.json({ error: "Missing publicSlug or question" }, { status: 400 })
        }
        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        if (question.length > 4000) {
            return Response.json({ error: "Question too long (max 4000 chars)" }, { status: 400 })
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
        // Bereits jetzt werden Zertifikate und Freitext als zusaetzliche Hinweise einbezogen.
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

        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        // Der OpenAI-Helper kapselt Timeout und Fehlerbehandlung.
        const ai = await callOpenAiChat({
            prompt,
            question,
            timeoutMs: 20_000,
        })
        if (!ai.ok) {
            console.error("[api/public-chat] OpenAI error:", ai.error)
            return Response.json({ error: "AI request failed" }, { status: 502 })
        }

        const answer = ai.content

        return Response.json({ answer })
    } catch (err) {
        console.error("[api/public-chat]", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}

