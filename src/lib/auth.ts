import { cookies } from "next/headers"
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto"
import { promisify } from "util"
import { prisma } from "@/lib/prisma"

const scrypt = promisify(_scrypt)

const SESSION_COOKIE = "htr_auth"
const SESSION_TTL_DAYS = 30

function base64UrlEncode(input: Buffer) {
    return input
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
}

function parseHash(stored: string) {
    const [method, saltB64, hashB64] = stored.split("$")
    if (method !== "scrypt" || !saltB64 || !hashB64) return null
    return {
        salt: Buffer.from(saltB64, "base64"),
        hash: Buffer.from(hashB64, "base64"),
    }
}

export async function hashPassword(password: string) {
    const salt = randomBytes(16)
    const derived = (await scrypt(password, salt, 64)) as Buffer
    return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string) {
    const parsed = parseHash(stored)
    if (!parsed) return false
    const derived = (await scrypt(password, parsed.salt, 64)) as Buffer
    if (derived.length !== parsed.hash.length) return false
    return timingSafeEqual(derived, parsed.hash)
}

export async function createSession(userId: string) {
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

    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    })

    if (!session) return null
    if (session.expiresAt.getTime() < Date.now()) {
        await prisma.session.delete({ where: { id: session.id } })
        cookieStore.delete(SESSION_COOKIE)
        return null
    }

    return session.user
}
