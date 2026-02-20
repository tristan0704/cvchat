// DATEIUEBERSICHT: API-Route fuer Registrierung: Benutzer anlegen, Session starten, optional CV verknuepfen.
import { prisma } from "@/lib/prisma"
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth"
import { ensureUserPublicSlug } from "@/lib/publicSlug"
import { enforceRateLimit } from "@/lib/securityRateLimit"

type RegisterBody = {
    email?: string
    password?: string
    name?: string
    token?: string
}

export async function POST(req: Request) {
    // SECURITY: Nicht beachten fÃ¼rs entwickeln
    const limited = enforceRateLimit(req, "auth-register", {
        windowMs: 60_000,
        max: 20,
    })
    if (limited) return limited

    const body = (await req.json()) as RegisterBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password?.trim()
    const name = body.name?.trim()
    const token = body.token?.trim()

    // Nur minimale MVP-Regeln: gueltige E-Mail und Mindestlaenge Passwort.
    if (!email || !email.includes("@") || !password || password.length < 6) {
        return Response.json(
            { error: "Invalid email or password (min 6 chars)" },
            { status: 400 }
        )
    }

    // Doppeltes Konto verhindern.
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return Response.json(
            { error: "Email already registered" },
            { status: 409 }
        )
    }

    const passwordHash = await hashPassword(password)

    // Nutzer anlegen und direkt eine Session erstellen
    // fuer einen nahtlosen Start nach der Registrierung.
    const user = await prisma.user.create({
        data: {
            email,
            name: name || null,
            passwordHash,
        },
    })
    const publicSlug = await ensureUserPublicSlug(user.id, name || email.split("@")[0])

    const session = await createSession(user.id)
    await setSessionCookie(session.token, session.expiresAt)

    if (token) {
        // Optional: bereits hochgeladener CV (anonym) wird uebernommen.
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

