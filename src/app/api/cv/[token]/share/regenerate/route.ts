import { getCvForWriteAccess } from "@/lib/cvAccess"
import { createShareToken } from "@/lib/cvPublishing"
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
            shareEnabled: true,
            shareToken: createShareToken(),
        },
        select: {
            shareEnabled: true,
            shareToken: true,
            isPublished: true,
        },
    })

    return Response.json(updated)
}
