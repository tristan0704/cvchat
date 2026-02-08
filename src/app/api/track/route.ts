import { trackEvent } from "@/lib/observability"

type TrackBody = {
    type?: string
    cvToken?: string
    context?: unknown
}

export async function POST(req: Request) {
    const body = (await req.json().catch(() => ({}))) as TrackBody
    const type = body.type?.trim()
    if (!type) {
        return Response.json({ error: "Missing type" }, { status: 400 })
    }

    await trackEvent({
        type,
        cvToken: body.cvToken?.trim() ?? null,
        context: body.context,
    })

    return Response.json({ ok: true })
}
