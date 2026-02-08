import { prisma } from "@/lib/prisma"
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth"

type RegisterBody = {
    email?: string
    password?: string
    name?: string
    token?: string
}

export async function POST(req: Request) {
    const body = (await req.json()) as RegisterBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password?.trim()
    const name = body.name?.trim()
    const token = body.token?.trim()

    if (!email || !email.includes("@") || !password || password.length < 6) {
        return Response.json(
            { error: "Invalid email or password (min 6 chars)" },
            { status: 400 }
        )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return Response.json(
            { error: "Email already registered" },
            { status: 409 }
        )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
        data: {
            email,
            name: name || null,
            passwordHash,
        },
    })

    const session = await createSession(user.id)
    await setSessionCookie(session.token, session.expiresAt)

    if (token) {
        await prisma.cv.updateMany({
            where: {
                token,
                OR: [{ userId: null }, { userId: user.id }],
            },
            data: { userId: user.id },
        })
    }

    return Response.json({
        user: { id: user.id, email: user.email, name: user.name },
    })
}
