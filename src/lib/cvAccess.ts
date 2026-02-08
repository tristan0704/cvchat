import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getCvForWriteAccess(token: string) {
    const user = await getSessionUser()
    const cv = await prisma.cv.findUnique({
        where: { token },
        include: {
            meta: true,
            certificates: true,
            references: true,
            additionalText: true,
        },
    })

    if (!cv) {
        return { error: Response.json({ error: "CV not found" }, { status: 404 }) }
    }

    // If the CV is owned by a user account, only that user can access internal routes.
    if (cv.userId && (!user || user.id !== cv.userId)) {
        return { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
    }

    return { cv, user }
}
