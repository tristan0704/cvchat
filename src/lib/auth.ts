// DATEIUEBERSICHT: Authentifizierung: Passwort-Hashing, Session-Erstellung, Cookie-Handling und aktuellen Benutzer aus Session laden.
import { cookies } from "next/headers"
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto"
import { promisify } from "util"
import { prisma } from "@/lib/prisma"

const scrypt = promisify(_scrypt)

const SESSION_COOKIE = "htr_auth"
const SESSION_TTL_DAYS = 30

function base64UrlEncode(input: Buffer) {
    // Session-Token soll cookie-sicher sein: daher URL-kompatibles Base64.
    return input
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
}

function parseHash(stored: string) {
    // Erwartetes Format: scrypt$salt$hash
    const [method, saltB64, hashB64] = stored.split("$")
    if (method !== "scrypt" || !saltB64 || !hashB64) return null
    return {
        salt: Buffer.from(saltB64, "base64"),
        hash: Buffer.from(hashB64, "base64"),
    }
}

export async function hashPassword(password: string) {
    // Jeder Hash bekommt ein eigenes Salt, damit gleiche Passwoerter
    // nicht den gleichen Hash erzeugen.
    const salt = randomBytes(16)
    const derived = (await scrypt(password, salt, 64)) as Buffer
    return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string) {
    const parsed = parseHash(stored)
    if (!parsed) return false
    const derived = (await scrypt(password, parsed.salt, 64)) as Buffer
    // timingSafeEqual verhindert einfache Timing-Angriffe.
    if (derived.length !== parsed.hash.length) return false
    return timingSafeEqual(derived, parsed.hash)
}

export async function createSession(userId: string) {
    // Neue Session in DB speichern; Cookie wird spaeter gesetzt.
    const token = base64UrlEncode(randomBytes(32))
    const expiresAt = new Date(
        Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    )

    await prisma.session.create({
        data: {
            token,
            userId,
            expiresAt,
        },
    })

    return { token, expiresAt }
}

export async function setSessionCookie(token: string, expiresAt: Date) {
    const cookieStore = await cookies()
    cookieStore.set({
        name: SESSION_COOKIE,
        value: token,
        // httpOnly: kein Zugriff via clientseitigem JavaScript.
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
    })
}

export async function clearSessionCookie() {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    // Session und Benutzer in einem Query laden.
    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    })

    if (!session) return null
    if (session.expiresAt.getTime() < Date.now()) {
        // Abgelaufene Sessions direkt bereinigen, damit sie nicht liegen bleiben.
        await prisma.session.delete({ where: { id: session.id } })
        cookieStore.delete(SESSION_COOKIE)
        return null
    }

    return session.user
}

