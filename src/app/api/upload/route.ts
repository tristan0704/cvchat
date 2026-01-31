export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { getParsePrompt } from "@/lib/prompts/parsePrompt"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file")

        if (!file || !(file instanceof File)) {
            return Response.json({ error: "No file received" }, { status: 400 })
        }

        if (file.type !== "application/pdf") {
            return Response.json({ error: "Only PDF files allowed" }, { status: 400 })
        }

        // wichtig: nur direkt pdf-parse verwenden, nicht die ganze pdf-parse-lib
        const pdfParse = require("pdf-parse/lib/pdf-parse")

        const buffer = Buffer.from(await file.arrayBuffer())
        const parsed = await pdfParse(buffer)

        if (!parsed.text || parsed.text.length < 100) {
            return Response.json(
                { error: "No readable text found in this PDF. Please upload a text-based (not scanned) resume." },
                { status: 400 }
            )
        }

        const parsePrompt = getParsePrompt(parsed.text)

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: parsePrompt }],
                temperature: 0,
            }),
        })

        const aiData = await aiResponse.json()
        const cvData = JSON.parse(aiData.choices[0].message.content)

        const token = randomUUID()

        await prisma.cv.create({
            data: {
                token,
                data: {
                    meta: {
                        token,
                        uploadedAt: new Date().toISOString(),
                    },
                    ...cvData,
                },
            },
        })

        return Response.json({ token })
    } catch (err) {
        console.error("Upload API error:", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
