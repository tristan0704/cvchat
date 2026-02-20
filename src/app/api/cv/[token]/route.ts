// DATEIUEBERSICHT: API-Route zum Laden eines CV-Profils inkl. Meta-Informationen.
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildProfileFromCvData } from "@/lib/profileContext"
import { ensureUserPublicSlug } from "@/lib/publicSlug"

export async function GET(
    _req: Request,
    context: { params: Promise<{ token: string }> }
) {
    // Token kommt aus der URL: /api/cv/[token]
    const { token } = await context.params

    if (!token || typeof token !== "string") {
        return Response.json(
            { error: "Missing or invalid token" },
            { status: 400 }
        )
    }

    const user = await getSessionUser()
    const cv = await prisma.cv.findUnique({
        where: { token },
        include: { meta: true },
    })

    if (!cv) {
        return Response.json({ error: "CV not found" }, { status: 404 })
    }

    if (cv.userId && (!user || user.id !== cv.userId)) {
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // UI erwartet ein fertiges "profile"-Objekt aus den Rohdaten.
    if (!cv.meta) {
        return Response.json({ error: "CV meta not found" }, { status: 404 })
    }

    // Legacy-/Onboarding-Fall: CV wurde ohne Session erstellt (userId = null).
    // Wenn jetzt ein User eingeloggt ist, binden wir das CV an ihn, damit Exporte funktionieren.
    let ownerUserId = cv.userId ?? null
    if (!ownerUserId && user) {
        await prisma.cv.update({
            where: { token: cv.token },
            data: { userId: user.id },
        })
        ownerUserId = user.id
    }

    // Exportseiten basieren auf einem stabilen publicSlug.
    // Fehlt er noch, wird er beim Laden des Dashboards angelegt.
    const publicSlug = ownerUserId
        ? await ensureUserPublicSlug(ownerUserId, user?.name || user?.email.split("@")[0])
        : null

    return Response.json({
        meta: {
            name: cv.meta.name,
            position: cv.meta.position,
            summary: cv.meta.summary,
            imageUrl: cv.meta.imageUrl,
        },
        owner: {
            publicSlug,
        },
        profile: buildProfileFromCvData(cv.data, {
            name: cv.meta.name,
            position: cv.meta.position,
            summary: cv.meta.summary,
            imageUrl: cv.meta.imageUrl,
        }),
        status: {
            updatedAt: cv.updatedAt,
            metaUpdatedAt: cv.meta.updatedAt,
        },
    })
}

