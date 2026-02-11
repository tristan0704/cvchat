import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureUserPublicSlug } from "@/lib/publicSlug"

export async function GET() {
    const user = await getSessionUser()
    if (!user) {
        return Response.json({ user: null })
    }

    const publicSlug = await ensureUserPublicSlug(user.id, user.name || user.email.split("@")[0])

    const cv = await prisma.cv.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { token: true },
    })

    return Response.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            publicSlug,
            cvToken: cv?.token ?? null,
        },
    })
}
