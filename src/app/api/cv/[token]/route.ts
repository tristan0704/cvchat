// DATEIUEBERSICHT: API-Route zum Laden eines CV-Profils inkl. Meta-Informationen.
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildProfileFromCvData } from "@/lib/profileContext"

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

    return Response.json({
        meta: {
            name: cv.meta.name,
            position: cv.meta.position,
            summary: cv.meta.summary,
            imageUrl: cv.meta.imageUrl,
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

