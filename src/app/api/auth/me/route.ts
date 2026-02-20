// DATEIUEBERSICHT: API-Route fuer aktuellen Session-Benutzer und zugehoerige Basisdaten.
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureUserPublicSlug } from "@/lib/publicSlug"

export async function GET() {
    // Session aus Cookie lesen; ohne Session kommt user: null zurueck.
    const user = await getSessionUser()
    if (!user) {
        return Response.json({ user: null })
    }

    // Sicherstellen, dass jeder Nutzer einen stabilen Public-Slug besitzt.
    const publicSlug = await ensureUserPublicSlug(user.id, user.name || user.email.split("@")[0])

    // Letztes CV-Token fuer Deep-Link ins Dashboard mitgeben.
    const cv = await prisma.cv.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { token: true },
    })

    return Response.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            publicSlug,
            cvToken: cv?.token ?? null,
        },
    })
}

