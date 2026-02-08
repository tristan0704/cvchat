export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import { getCvParsePrompt } from "@/lib/prompts/parsePrompt/getCvParsePrompt"
import { getCertificateParsePrompt } from "@/lib/prompts/parsePrompt/getCertificateParsePrompt"
import { randomUUID } from "crypto"
import { uploadProfileImage } from "@/lib/uploadProfileImage"

export async function POST(req: Request) {
    try {
        const sessionUser = await getSessionUser()
        const formData = await req.formData()

        const cvFile = formData.get("cv")
        const referenceFiles = formData.getAll("references")
        const certificateFiles = formData.getAll("certificates")
        const additionalText = formData.get("additionalText")
        const imageFile = formData.get("image") as File | null

        // --------------------
        // VALIDATE CV FILE
        // --------------------
        if (!cvFile || !(cvFile instanceof File)) {
            return Response.json({ error: "CV file is required" }, { status: 400 })
        }

        if (cvFile.type !== "application/pdf") {
            return Response.json({ error: "CV must be a PDF file" }, { status: 400 })
        }

        // --------------------
        // IMAGE VALIDATION
        // --------------------
        let imageUrl: string | null = null

        if (imageFile) {
            if (!imageFile.type.startsWith("image/")) {
                return Response.json(
                    { error: "Profile image must be an image" },
                    { status: 400 }
                )
            }

            if (imageFile.size > 2_000_000) {
                return Response.json(
                    { error: "Profile image must be smaller than 2MB" },
                    { status: 400 }
                )
            }
        }

        // --------------------
        // PDF PARSER
        // --------------------
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

        if (!aiData.choices?.[0]?.message?.content) {
            console.error("OpenAI returned invalid response:", aiData)
            return Response.json({ error: "AI parsing failed" }, { status: 500 })
        }

        let cvData
        try {
            cvData = JSON.parse(aiData.choices[0].message.content)
        } catch (err) {
            console.error("Failed to parse CV JSON:", err)
            return Response.json({ error: "AI parsing failed" }, { status: 500 })
        }

        // --------------------
        // TOKEN + IMAGE UPLOAD
        // --------------------
        const token = randomUUID()

        if (imageFile) {
            imageUrl = await uploadProfileImage(imageFile, token)
        }

        // --------------------
        // CREATE CV + META
        // --------------------
        const profile = await prisma.cv.create({
            data: {
                token,
                userId: sessionUser?.id ?? null,
                data: cvData,

                meta: {
                    create: {
                        name: cvData.person?.name ?? "",
                        position: cvData.person?.title ?? "",
                        summary: cvData.person?.summary ?? "",
                        imageUrl,
                    },
                },
            },
        })

        // --------------------
        // REFERENCES
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
        // CERTIFICATES
        // --------------------
        for (const file of certificateFiles) {
            if (file instanceof File && file.type === "application/pdf") {
                const text = await parsePdfText(file)

                const certPrompt = getCertificateParsePrompt(text)

                const certResponse = await fetch(
                    "https://api.openai.com/v1/chat/completions",
                    {
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
                    }
                )

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
