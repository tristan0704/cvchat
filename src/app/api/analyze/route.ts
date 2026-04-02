import { analyzeCvQualityWithLLM } from "@/lib/cv-analysis/analyzeCvQualityWithLLM"
import { suggestRolesWithLLM } from "@/lib/cv-analysis/suggestRolesWithLLM"
import { pdfToText } from "@/lib/cv-analysis/pdfToText"

export const runtime = "nodejs"

const MAX_CV_BYTES = 20_000_000
export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file")

        if (!file || !(file instanceof File)) {
            return Response.json({ error: "PDF file is required" }, { status: 400 })
        }

        if (file.type !== "application/pdf") {
            return Response.json({ error: "PDF file must be application/pdf" }, { status: 400 })
        }

        if (file.size > MAX_CV_BYTES) {
            return Response.json({ error: "PDF must be smaller than 20MB" }, { status: 400 })
        }

        console.log("[api/analyze] file metadata", {
            name: file.name,
            size: file.size,
            type: file.type,
        })

        const arrayBuffer = await file.arrayBuffer()
        console.log("[api/analyze] converted to buffer (bytes)", arrayBuffer.byteLength)
        const buffer = Buffer.from(arrayBuffer)

        console.log("[api/analyze] starting text extraction")
        const cvText = await pdfToText(buffer)
        console.log("[api/analyze] extracted text preview", cvText.slice(0, 300))

        const quality = await analyzeCvQualityWithLLM(cvText)
        const result = await suggestRolesWithLLM(cvText)
        console.log("[api/analyze] role suggestions", result.roles)
        console.log("[api/analyze] quality analysis", quality)

        return Response.json({ ...result, quality })
    } catch (error) {
        console.error("[api/analyze]", error)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
