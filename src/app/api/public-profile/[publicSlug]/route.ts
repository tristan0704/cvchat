import { prisma } from "@/lib/prisma"
import { buildProfileFromCvData } from "@/lib/profileContext"

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
                orderBy: { updatedAt: "desc" },
                take: 1,
                select: {
                    token: true,
                    updatedAt: true,
                    data: true,
                    meta: {
                        select: {
                            name: true,
                            position: true,
                            summary: true,
                            imageUrl: true,
                        },
                    },
                },
            },
        },
    })

    const cv = user?.cvs[0]
    if (!user || !cv || !cv.meta) {
        return Response.json({ error: "Not found" }, { status: 404 })
    }

    // NOTE: export is currently "latest CV by user". Fine for MVP.
    // BAUSTELLE: add explicit access control/release workflow per profile snapshot.
    const profile = buildProfileFromCvData(cv.data, cv.meta)
    return Response.json({
        publicSlug: user.publicSlug,
        cvToken: cv.token,
        updatedAt: cv.updatedAt,
        meta: cv.meta,
        profile,
    })
}
