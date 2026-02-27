// DATEIUEBERSICHT: API-Route fuer Upload/Parsing von CV und Zertifikaten inkl. Persistierung.
export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import { getCvParsePrompt } from "@/lib/prompts/parsePrompt/getCvParsePrompt"
import { getCertificateParsePrompt } from "@/lib/prompts/parsePrompt/getCertificateParsePrompt"
import { randomUUID } from "crypto"
import { uploadProfileImage } from "@/lib/uploadProfileImage"
import { enforceRateLimit } from "@/lib/securityRateLimit"
import { callOpenAiChat } from "@/lib/openai"

const MAX_MULTIPART_BYTES = 50_000_000
const MAX_CV_BYTES = 20_000_000
const MAX_CERTIFICATE_BYTES = 15_000_000
const MAX_CERTIFICATES = 20
const MAX_ADDITIONAL_TEXT = 20_000

export async function POST(req: Request) {
    try {
        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        const limited = enforceRateLimit(req, "upload", {
            windowMs: 60_000,
            max: 30,
        })
        if (limited) return limited

        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        const contentLength = Number(req.headers.get("content-length") || "0")
        if (
            Number.isFinite(contentLength) &&
            contentLength > 0 &&
            contentLength > MAX_MULTIPART_BYTES
        ) {
            // Fruher Abbruch, bevor grosse Requests weiter verarbeitet werden.
            return Response.json(
                { error: "Upload too large (max 50MB)" },
                { status: 413 }
            )
        }

        const sessionUser = await getSessionUser()
        const formData = await req.formData()

        // Aktueller Onboarding-Scope:
        // CV (Pflicht), Zertifikate/Bild/Zusatztext (optional), Projekt nur als Placeholder.
        const cvFile = formData.get("cv")
        const certificateFiles = formData.getAll("certificates")
        const additionalText = formData.get("additionalText")
        const imageFile = formData.get("image") as File | null
        const projectPlaceholder = formData.get("projectPlaceholder")

        // --------------------
        // VALIDATE CV FILE
        // --------------------
        if (!cvFile || !(cvFile instanceof File)) {
            return Response.json({ error: "CV file is required" }, { status: 400 })
        }

        if (cvFile.type !== "application/pdf") {
            return Response.json({ error: "CV must be a PDF file" }, { status: 400 })
        }
        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        if (cvFile.size > MAX_CV_BYTES) {
            return Response.json(
                { error: "CV must be smaller than 20MB" },
                { status: 400 }
            )
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

        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        if (certificateFiles.length > MAX_CERTIFICATES) {
            return Response.json(
                { error: "Too many certificates (max 20)" },
                { status: 400 }
            )
        }
        // Alle Zertifikate werden vor dem eigentlichen Parsing validiert,
        // damit wir bei Fehlern konsistent abbrechen.
        for (const file of certificateFiles) {
            if (!(file instanceof File)) continue
            if (file.type !== "application/pdf") {
                return Response.json(
                    { error: "Certificates must be PDF files" },
                    { status: 400 }
                )
            }
            if (file.size > MAX_CERTIFICATE_BYTES) {
                return Response.json(
                    { error: "Each certificate must be smaller than 15MB" },
                    { status: 400 }
                )
            }
        }

        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        if (
            typeof additionalText === "string" &&
            additionalText.length > MAX_ADDITIONAL_TEXT
        ) {
            return Response.json(
                { error: "Additional text too long (max 20000 chars)" },
                { status: 400 }
            )
        }

        // --------------------
        // PDF PARSER
        // --------------------
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse/lib/pdf-parse")

        async function parsePdfText(file: File): Promise<string> {
            // Datei aus FormData nach Buffer konvertieren, dann Text extrahieren.
            const buffer = Buffer.from(await file.arrayBuffer())
            const parsed = await pdfParse(buffer)
            return parsed.text?.trim() ?? ""
        }

        // --------------------
        // CV PARSING
        // --------------------
        const cvText = await parsePdfText(cvFile)

        if (cvText.length < 100) {
            // Sehr kurzer Text deutet oft auf gescannte Bild-PDFs ohne OCR hin.
            return Response.json(
                { error: "CV PDF contains no readable text (scanned PDFs not supported)" },
                { status: 400 }
            )
        }

        const cvPrompt = getCvParsePrompt(cvText)

        // SECURITY: Nicht beachten fÃ¼rs entwickeln
        const cvAi = await callOpenAiChat({
            prompt: cvPrompt,
            timeoutMs: 25_000,
        })
        if (!cvAi.ok) {
            console.error("[api/upload] CV parse failed:", cvAi.error)
            return Response.json({ error: "AI parsing failed" }, { status: 502 })
        }

        let cvData
        try {
            cvData = JSON.parse(cvAi.content)
        } catch (err) {
            // Falls das LLM kein gueltiges JSON liefert, ist der Datensatz unbrauchbar.
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

        // Kernpipeline fuer das MVP:
        // Aus dem CV wird ein strukturiertes Profil erzeugt und direkt persistiert.
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

        // Zertifikate werden parallel geparst fuer bessere Performance bei vielen Uploads.
        const validCertFiles = certificateFiles.filter(
            (file): file is File => file instanceof File && file.type === "application/pdf"
        )

        const certResults = await Promise.allSettled(
            validCertFiles.map(async (file) => {
                const text = await parsePdfText(file)
                const certPrompt = getCertificateParsePrompt(text)

                // SECURITY: Nicht beachten fÃ¼rs entwickeln
                const certAi = await callOpenAiChat({
                    prompt: certPrompt,
                    timeoutMs: 25_000,
                })
                if (!certAi.ok) {
                    throw new Error(`Certificate parse failed: ${certAi.error}`)
                }

                const parsedCert = JSON.parse(certAi.content)
                return { parsedCert, text }
            })
        )

        for (const result of certResults) {
            if (result.status === "rejected") {
                console.error("[api/upload] Certificate parse failed:", result.reason)
                return Response.json({ error: "AI parsing failed" }, { status: 502 })
            }

            // Zertifikate werden als separate Evidenz gespeichert,
            // damit Chat und spaetere Bewertung darauf zugreifen koennen.
            await prisma.certificate.create({
                data: {
                    cvToken: profile.token,
                    data: result.value.parsedCert,
                    rawText: result.value.text,
                },
            })
        }

        // BAUSTELLE-Hinweis zum Projekt-Upload wird bewusst im Zusatztext mitgespeichert,
        // damit die nachgelagerte Analyse bereits eine Spur fuer den naechsten Ausbau hat.
        if (typeof additionalText === "string" && additionalText.trim()) {
            await prisma.additionalText.create({
                data: {
                    cvToken: profile.token,
                    content: additionalText.trim() + (typeof projectPlaceholder === "string" && projectPlaceholder.trim()
                        ? `\n\n[BAUSTELLE: PROJECT_UPLOAD_PLACEHOLDER]\n${projectPlaceholder.trim()}`
                        : ""),
                },
            })
        } else if (typeof projectPlaceholder === "string" && projectPlaceholder.trim()) {
            await prisma.additionalText.create({
                data: {
                    cvToken: profile.token,
                    content: `[BAUSTELLE: PROJECT_UPLOAD_PLACEHOLDER]\n${projectPlaceholder.trim()}`,
                },
            })
        }

        return Response.json({ token })
    } catch (err) {
        console.error("[api/upload]", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}

