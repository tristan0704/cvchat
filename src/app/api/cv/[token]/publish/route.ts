import { buildPublishedSnapshot } from "@/lib/cvPublishing"
import { getCvForWriteAccess } from "@/lib/cvAccess"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function POST(
    _req: Request,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params
    if (!token) {
        return Response.json({ error: "Missing token" }, { status: 400 })
    }

    const access = await getCvForWriteAccess(token)
    if ("error" in access) return access.error

    const snapshot = buildPublishedSnapshot(access.cv)
    const publishedAt = new Date()

    const updated = await prisma.cv.update({
        where: { token },
        data: {
            isPublished: true,
            publishedData: snapshot as Prisma.InputJsonValue,
            publishedAt,
        },
        select: {
            isPublished: true,
            publishedAt: true,
            shareEnabled: true,
            shareToken: true,
        },
    })

    return Response.json(updated)
}
