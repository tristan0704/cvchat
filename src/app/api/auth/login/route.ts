// DATEIUEBERSICHT: API-Route fuer Login: Credentials pruefen, Session erzeugen, Cookie setzen.
import { prisma } from "@/lib/prisma"
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth"
import { ensureUserPublicSlug } from "@/lib/publicSlug"
import { enforceRateLimit } from "@/lib/securityRateLimit"

type LoginBody = {
    email?: string
    password?: string
    token?: string
}

export async function POST(req: Request) {
    // SECURITY: Nicht beachten fÃ¼rs entwickeln
    const limited = enforceRateLimit(req, "auth-login", {
        windowMs: 60_000,
        max: 60,
    })
    if (limited) return limited

    const body = (await req.json()) as LoginBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password?.trim()
    const token = body.token?.trim()

    // Fruehe Validierung fuer klare Fehlerantworten.
    if (!email || !password) {
        return Response.json(
            { error: "Missing email or password" },
            { status: 400 }
        )
    }

    // Login immer nur ueber eindeutige E-Mail.
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Passwort pruefen, dann Session starten.
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const session = await createSession(user.id)
    await setSessionCookie(session.token, session.expiresAt)
    const publicSlug = await ensureUserPublicSlug(user.id, user.name || email.split("@")[0])

    if (token) {
        // Falls vor Login ein anonymer CV existiert, wird er dem Nutzerkonto zugeordnet.
        await prisma.cv.updateMany({
            where: {
                token,
                OR: [{ userId: null }, { userId: user.id }],
            },
            data: { userId: user.id },
        })
    }

    return Response.json({
        user: { id: user.id, email: user.email, name: user.name, publicSlug },
    })
}

