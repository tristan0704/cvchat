import { prisma } from "@/lib/prisma"
import { PublishedSnapshot } from "@/lib/cvPublishing"

export async function GET(
    _req: Request,
    context: { params: Promise<{ shareToken: string }> }
) {
    const { shareToken } = await context.params
    if (!shareToken) {
        return Response.json({ error: "Missing share token" }, { status: 400 })
    }

    const cv = await prisma.cv.findUnique({
        where: { shareToken },
        select: {
            isPublished: true,
            shareEnabled: true,
            publishedAt: true,
            updatedAt: true,
            publishedData: true,
        },
    })

    if (!cv || !cv.isPublished || !cv.shareEnabled || !cv.publishedData) {
        return Response.json({ error: "Not found" }, { status: 404 })
    }

    const snapshot = cv.publishedData as PublishedSnapshot
    return Response.json({
        meta: snapshot.meta,
        publishedAt: cv.publishedAt,
        updatedAt: cv.updatedAt,
    })
}
