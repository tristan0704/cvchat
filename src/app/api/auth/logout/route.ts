import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { clearSessionCookie } from "@/lib/auth"

export async function POST() {
    const cookieStore = await cookies()
    const token = cookieStore.get("htr_auth")?.value

    if (token) {
        await prisma.session.deleteMany({ where: { token } })
    }

    await clearSessionCookie()
    return Response.json({ ok: true })
}
