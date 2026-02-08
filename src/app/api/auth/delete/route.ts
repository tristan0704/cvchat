import { prisma } from "@/lib/prisma"
import { clearSessionCookie, getSessionUser } from "@/lib/auth"

type DeleteBody = {
    token?: string
}

export async function POST(req: Request) {
    const user = await getSessionUser()
    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as DeleteBody
    const token = body.token?.trim()

    if (token) {
        const cv = await prisma.cv.findUnique({
            where: { token },
            select: { userId: true },
        })

        if (!cv) {
            return Response.json({ error: "CV not found" }, { status: 404 })
        }

        if (cv.userId !== user.id) {
            return Response.json({ error: "Forbidden" }, { status: 403 })
        }
    }

    await prisma.user.delete({ where: { id: user.id } })
    await clearSessionCookie()

    return Response.json({ ok: true })
}
