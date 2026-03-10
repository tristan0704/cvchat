export const runtime = "nodejs"

import { Prisma } from "@prisma/client"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import { enforceRateLimit } from "@/lib/securityRateLimit"
import { callOpenAiChat } from "@/lib/openai"
import { getCvParsePrompt } from "@/lib/prompts/parsePrompt/getCvParsePrompt"

const MAX_MULTIPART_BYTES = 25_000_000
const MAX_CV_BYTES = 20_000_000
const MAX_CONTEXT_TEXT = 20_000
const MISSING_CONTEXT_TEXT_COLUMN = "contextText"

function isMissingContextTextColumnError(err: unknown) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false
    if (err.code !== "P2022") return false

    const column = err.meta?.column
    return typeof column === "string" && column.includes(MISSING_CONTEXT_TEXT_COLUMN)
}

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

        const sessionUser = await getSessionUser()
        const formData = await req.formData()
        const cvFile = formData.get("cv")
        const additionalText = formData.get("additionalText")
        const projectPlaceholder = formData.get("projectPlaceholder")

        if (!cvFile || !(cvFile instanceof File)) {
            return Response.json({ error: "CV file is required" }, { status: 400 })
        }

        if (cvFile.type !== "application/pdf") {
            return Response.json({ error: "CV must be a PDF file" }, { status: 400 })
        }

        if (cvFile.size > MAX_CV_BYTES) {
            return Response.json({ error: "CV must be smaller than 20MB" }, { status: 400 })
        }

        const contextText = [additionalText, projectPlaceholder]
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
            .join("\n\n")

        if (contextText.length > MAX_CONTEXT_TEXT) {
            return Response.json({ error: "Additional context too long (max 20000 chars)" }, { status: 400 })
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

        let cvData: Prisma.InputJsonValue
        try {
            cvData = JSON.parse(cvAi.content) as Prisma.InputJsonValue
        } catch (err) {
            console.error("[api/upload] Failed to parse CV JSON:", err)
            return Response.json({ error: "AI parsing failed" }, { status: 500 })
        }

        const token = randomUUID()
        try {
            await prisma.cv.create({
                data: {
                    token,
                    userId: sessionUser?.id ?? null,
                    data: cvData,
                    contextText: contextText || null,
                },
            })
        } catch (err) {
            if (!isMissingContextTextColumnError(err)) throw err

            console.warn("[api/upload] Database missing Cv.contextText column; retrying without contextText")
            await prisma.cv.create({
                data: {
                    token,
                    userId: sessionUser?.id ?? null,
                    data: cvData,
                },
            })
        }

        return Response.json({ token })
    } catch (err) {
        console.error("[api/upload]", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
