/**
 * Voice interview face-analysis endpoint.
 *
 * This route is called after a voice session ends. It accepts either the raw
 * face-landmark export or already structured snapshots and returns the final
 * body-language report used by the interview feedback flow
 *
 * **Einfach gesagt**: Der Code nimmt Daten entgegen (egal in welchem Format), bereitet sie auf, analysiert sie und gibt ein Ergebnis zurück.
 * Die eigentliche Analyse passiert in den importierten Funktionen - dieser Code hier ist nur der "Empfänger" und "Koordinator".
 * .
 */




import { analyzeFaceLandmarkSession, parseFaceLandmarkSnapshots, parseFaceLandmarkTxt } from "@/lib/face-analysis"

export const runtime = "nodejs"

async function readRequestPayload(req: Request) {
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? ""

    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData()
        const file = formData.get("file")
        const content = typeof formData.get("content") === "string" ? String(formData.get("content")) : ""
        const role = typeof formData.get("role") === "string" ? String(formData.get("role")).trim() : ""
        const snapshotsField = typeof formData.get("snapshots") === "string" ? String(formData.get("snapshots")) : ""

        if (file instanceof File && file.size > 0) {
            return {
                role,
                snapshots: parseFaceLandmarkTxt(await file.text()),
            }
        }

        if (snapshotsField.trim()) {
            return {
                role,
                snapshots: parseFaceLandmarkTxt(snapshotsField),
            }
        }

        return {
            role,
            snapshots: parseFaceLandmarkTxt(content),
        }
    }

    const rawBody = await req.text()
    if (!rawBody.trim()) {
        throw new Error("Request Body ist leer.")
    }

    if (contentType.includes("application/json")) {
        const parsed = JSON.parse(rawBody) as {
            role?: unknown
            content?: unknown
            snapshots?: unknown
        }
        const role = typeof parsed.role === "string" ? parsed.role.trim() : ""

        if (Array.isArray(parsed.snapshots)) {
            return {
                role,
                snapshots: parseFaceLandmarkSnapshots(parsed.snapshots),
            }
        }

        if (typeof parsed.content === "string") {
            return {
                role,
                snapshots: parseFaceLandmarkTxt(parsed.content),
            }
        }
    }

    return {
        role: "",
        snapshots: parseFaceLandmarkTxt(rawBody),
    }
}

export async function POST(req: Request) {
    try {
        const { role, snapshots } = await readRequestPayload(req)
        const report = analyzeFaceLandmarkSession({
            role,
            snapshots,
        })

        return Response.json(report)
    } catch (error) {
        const message = error instanceof Error ? error.message : "Face-Analyse konnte nicht erstellt werden."
        return Response.json({ error: message }, { status: 400 })
    }
}
