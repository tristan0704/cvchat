import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    _req: Request,
    context: { params: Promise<{ token: string }> }
) {
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

    if (!cv.meta) {
        return Response.json({ error: "CV meta not found" }, { status: 404 })
    }

    const needsRepublish =
        !!cv.isPublished &&
        !!cv.publishedAt &&
        cv.meta.updatedAt.getTime() > cv.publishedAt.getTime()

    return Response.json({
        meta: {
            name: cv.meta.name,
            position: cv.meta.position,
            summary: cv.meta.summary,
            imageUrl: cv.meta.imageUrl,
        },
        status: {
            isPublished: cv.isPublished,
            shareEnabled: cv.shareEnabled,
            shareToken: cv.shareToken,
            publishedAt: cv.publishedAt,
            updatedAt: cv.updatedAt,
            metaUpdatedAt: cv.meta.updatedAt,
            needsRepublish,
        },
    })
}
