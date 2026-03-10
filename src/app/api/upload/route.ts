export const runtime = "nodejs"

const MAX_MULTIPART_BYTES = 25_000_000
const MAX_CV_BYTES = 20_000_000

export async function POST(req: Request) {
    try {
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

        return Response.json({ ok: true })
    } catch (err) {
        console.error("[api/upload]", err)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
