import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type TrackEventInput = {
    type: string
    cvToken?: string | null
    context?: unknown
}

export async function trackEvent(input: TrackEventInput) {
    const user = await getSessionUser().catch(() => null)
    await prisma.appEvent.create({
        data: {
            type: input.type,
            cvToken: input.cvToken ?? null,
            userId: user?.id ?? null,
            context: input.context ? JSON.parse(JSON.stringify(input.context)) : undefined,
        },
    })
}

export async function captureServerError(
    location: string,
    error: unknown,
    extra?: { cvToken?: string | null; context?: unknown }
) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[${location}]`, error)
    await trackEvent({
        type: "server_error",
        cvToken: extra?.cvToken ?? null,
        context: {
            location,
            message,
            ...(extra?.context ? { extra: extra.context } : {}),
        },
    }).catch(() => {})
}
