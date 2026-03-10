export const runtime = "nodejs"

import { randomUUID } from "crypto"
import { enforceRateLimit } from "@/lib/securityRateLimit"
import { callOpenAiChat } from "@/lib/openai"
import { getCvParsePrompt } from "@/lib/prompts/parsePrompt/getCvParsePrompt"

const MAX_MULTIPART_BYTES = 25_000_000
const MAX_CV_BYTES = 20_000_000

export async function POST(req: Request) {
    try {
        const limited = enforceRateLimit(req, "upload", {
            windowMs: 60_000,
            max: 30,
        })
        if (limited) return limited

        const contentLength = Number(req.headers.get("content-length") || "0")
        if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
            return Response.json({ error: "Upload too large (max 25MB)" }, { status: 413 })
        }

        const formData = await req.formData()
        const cvFile = formData.get("cv")

        if (!cvFile || !(cvFile instanceof File)) {
            return Response.json({ error: "CV file is required" }, { status: 400 })
        }

        if (cvFile.type !== "application/pdf") {
            return Response.json({ error: "CV must be a PDF file" }, { status: 400 })
        }

        if (cvFile.size > MAX_CV_BYTES) {
            return Response.json({ error: "CV must be smaller than 20MB" }, { status: 400 })
        }

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse/lib/pdf-parse")
        const buffer = Buffer.from(await cvFile.arrayBuffer())
        const parsed = await pdfParse(buffer)
        const cvText = parsed.text?.trim() ?? ""

        if (cvText.length < 100) {
            return Response.json(
                { error: "CV PDF contains no readable text (scanned PDFs not supported)" },
                { status: 400 }
            )
        }

        const cvAi = await callOpenAiChat({
            prompt: getCvParsePrompt(cvText),
            timeoutMs: 25_000,
        })

        if (!cvAi.ok) {
            console.error("[api/upload] CV parse failed:", cvAi.error)
            return Response.json({ error: "AI parsing failed" }, { status: 502 })
        }

        try {
            JSON.parse(cvAi.content)
        } catch (err) {
            console.error("[api/upload] Failed to parse CV JSON:", err)
            return Response.json({ error: "AI parsing failed" }, { status: 500 })
        }

        const token = randomUUID()
        return Response.json({ token })
    } catch (err) {
        console.error("[api/upload]", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
