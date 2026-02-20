// DATEIUEBERSICHT: Zugriffspruefung fuer CV-Schreibzugriffe auf Basis von Session und Besitzverhaeltnis.
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getCvForWriteAccess(token: string) {
    // Session optional laden; fuer anonyme CVs kann user null sein.
    const user = await getSessionUser()
    const cv = await prisma.cv.findUnique({
        where: { token },
        include: {
            meta: true,
            certificates: true,
            additionalText: true,
        },
    })

    if (!cv) {
        return { error: Response.json({ error: "CV not found" }, { status: 404 }) }
    }

    // Sobald ein CV einem Account gehoert, darf nur der Besitzer schreiben.
    if (cv.userId && (!user || user.id !== cv.userId)) {
        return { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
    }

    return { cv, user }
}

