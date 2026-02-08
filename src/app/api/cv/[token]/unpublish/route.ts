import { getCvForWriteAccess } from "@/lib/cvAccess"
import { prisma } from "@/lib/prisma"

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

    const updated = await prisma.cv.update({
        where: { token },
        data: {
            isPublished: false,
            shareEnabled: false,
        },
        select: {
            isPublished: true,
            shareEnabled: true,
            shareToken: true,
            publishedAt: true,
        },
    })

    return Response.json(updated)
}
