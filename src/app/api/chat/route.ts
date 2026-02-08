import { prisma } from "@/lib/prisma"
import { getChatPrompt } from "@/lib/prompts/chatPrompt"
import { getSessionUser } from "@/lib/auth"
import { captureServerError, trackEvent } from "@/lib/observability"

export async function POST(req: Request) {
    try {
        const { token, question } = await req.json()

        if (!token || !question) {
            return Response.json(
                { error: "Missing token or question" },
                { status: 400 }
            )
        }

    // --------------------
    // CV
    // --------------------
        const cvRecord = await prisma.cv.findUnique({
            where: { token },
        })

        if (!cvRecord) {
            return Response.json(
                { error: "CV not found" },
                { status: 404 }
            )
        }

        const user = await getSessionUser()
        if (cvRecord.userId && (!user || user.id !== cvRecord.userId)) {
            return Response.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

    // --------------------
    // Additional documents
    // --------------------
        const [certificates, references, additionalTexts] = await Promise.all([
            prisma.certificate.findMany({
                where: { cvToken: token },
            }),
            prisma.referenceDocument.findMany({
                where: { cvToken: token },
            }),
            prisma.additionalText.findMany({
                where: { cvToken: token },
            }),
        ])

    // --------------------
    // COMMON CONTEXT
    // --------------------
        const context = {
            cv: cvRecord.data,
            certificates: certificates.map(c => c.data),
            references: references.map(r => r.rawText),
            additionalText: additionalTexts.map(a => a.content),
        }

        const prompt = getChatPrompt(context)

    // --------------------
    // OpenAI call
    // --------------------
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
            type: "internal_question_asked",
            cvToken: token,
            context: { questionLength: String(question).length },
        })

        return Response.json({ answer })
    } catch (err) {
        await captureServerError("api/chat", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
