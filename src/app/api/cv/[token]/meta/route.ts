import { getCvForWriteAccess } from "@/lib/cvAccess"
import { prisma } from "@/lib/prisma"

type MetaPatchBody = {
    summary?: string
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params
    if (!token) {
        return Response.json({ error: "Missing token" }, { status: 400 })
    }

    const body = (await req.json().catch(() => ({}))) as MetaPatchBody
    const summary = body.summary?.trim()

    if (typeof summary !== "string") {
        return Response.json(
            { error: "Missing summary" },
            { status: 400 }
        )
    }

    if (summary.length > 2000) {
        return Response.json(
            { error: "Summary too long (max 2000 chars)" },
            { status: 400 }
        )
    }

    const access = await getCvForWriteAccess(token)
    if ("error" in access) return access.error

    const existingMeta = access.cv.meta
    if (!existingMeta) {
        return Response.json({ error: "CV meta not found" }, { status: 404 })
    }

    const updatedMeta = await prisma.cvMeta.update({
        where: { cvToken: token },
        data: { summary },
        select: {
            name: true,
            position: true,
            summary: true,
            imageUrl: true,
            updatedAt: true,
        },
    })

    return Response.json(updatedMeta)
}
