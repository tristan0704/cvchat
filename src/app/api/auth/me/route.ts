import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const user = await getSessionUser()
    if (!user) {
        return Response.json({ user: null })
    }

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
            cvToken: cv?.token ?? null,
        },
    })
}
