import { prisma } from "@/lib/prisma"
import { PublishedSnapshot } from "@/lib/cvPublishing"
import { buildPublicProfile } from "@/lib/profileContext"

export async function GET(
    _req: Request,
    context: { params: Promise<{ publicSlug: string }> }
) {
    const { publicSlug } = await context.params
    if (!publicSlug) {
        return Response.json({ error: "Missing public slug" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { publicSlug: publicSlug.trim().toLowerCase() },
        select: {
            id: true,
            publicSlug: true,
            cvs: {
                where: {
                    isPublished: true,
                    shareEnabled: true,
                },
                orderBy: { publishedAt: "desc" },
                take: 1,
                select: {
                    publishedAt: true,
                    updatedAt: true,
                    publishedData: true,
                },
            },
        },
    })

    const cv = user?.cvs[0]
    if (!user || !cv || !cv.publishedData) {
        return Response.json({ error: "Not found" }, { status: 404 })
    }

    const snapshot = cv.publishedData as PublishedSnapshot
    return Response.json({
        publicSlug: user.publicSlug,
        publishedAt: cv.publishedAt,
        updatedAt: cv.updatedAt,
        ...buildPublicProfile(snapshot),
    })
}
