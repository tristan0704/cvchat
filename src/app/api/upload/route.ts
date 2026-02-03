export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { getCvParsePrompt } from "@/lib/prompts/parsePrompt/getCvParsePrompt"
import { getCertificateParsePrompt } from "@/lib/prompts/parsePrompt/getCertificateParsePrompt"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
    try {
        const formData = await req.formData()

        const cvFile = formData.get("cv")
        const referenceFiles = formData.getAll("references")
        const certificateFiles = formData.getAll("certificates")
        const additionalText = formData.get("additionalText")

        if (!cvFile || !(cvFile instanceof File)) {
            return Response.json({ error: "CV file is required" }, { status: 400 })
        }

        if (cvFile.type !== "application/pdf") {
            return Response.json({ error: "CV must be a PDF file" }, { status: 400 })
        }

        const pdfParse = require("pdf-parse/lib/pdf-parse")

        async function parsePdfText(file: File): Promise<string> {
            const buffer = Buffer.from(await file.arrayBuffer())
            const parsed = await pdfParse(buffer)
            return parsed.text?.trim() ?? ""
        }

        // --------------------
        // CV PARSING
        // --------------------
        const cvText = await parsePdfText(cvFile)

        if (cvText.length < 100) {
            return Response.json(
                { error: "CV PDF contains no readable text (scanned PDFs not supported)" },
                { status: 400 }
            )
        }

        const cvPrompt = getCvParsePrompt(cvText)

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: cvPrompt }],
                temperature: 0,
            }),
        })

        const aiData = await aiResponse.json()

// guard for invalid responses of the ai
        if (!aiData.choices || !aiData.choices[0]?.message?.content) {
            console.error("OpenAI returned invalid response:", aiData)
            return Response.json(
                { error: "AI parsing failed" },
                { status: 500 }
            )
        }

        let cvData

        try {
            cvData = JSON.parse(aiData.choices[0].message.content)
        } catch (err) {
            console.error("Failed to parse CV JSON:", err)
            return Response.json(
                { error: "AI parsing failed" },
                { status: 500 }
            )
        }


        const token = randomUUID()

        // --------------------
        // CREATE CV (token = PK)
        // --------------------
        const profile = await prisma.cv.create({
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

        // --------------------
        // REFERENCES (TEXT ONLY)
        // --------------------
        for (const file of referenceFiles) {
            if (file instanceof File && file.type === "application/pdf") {
                const text = await parsePdfText(file)

                await prisma.referenceDocument.create({
                    data: {
                        cvToken: profile.token,
                        rawText: text,
                    },
                })
            }
        }

        // --------------------
        // CERTIFICATES (LIGHT PARSE)
        // --------------------
        for (const file of certificateFiles) {
            if (file instanceof File && file.type === "application/pdf") {
                const text = await parsePdfText(file)

                const certPrompt = getCertificateParsePrompt(text)

                const certResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [{ role: "system", content: certPrompt }],
                        temperature: 0,
                    }),
                })

                const certData = await certResponse.json()
                const parsedCert = JSON.parse(certData.choices[0].message.content)

                await prisma.certificate.create({
                    data: {
                        cvToken: profile.token,
                        data: parsedCert,
                        rawText: text,
                    },
                })
            }
        }

        // --------------------
        // ADDITIONAL TEXT
        // --------------------
        if (typeof additionalText === "string" && additionalText.trim()) {
            await prisma.additionalText.create({
                data: {
                    cvToken: profile.token,
                    content: additionalText.trim(),
                },
            })
        }

        return Response.json({ token })
    } catch (err) {
        console.error("Upload API error:", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
