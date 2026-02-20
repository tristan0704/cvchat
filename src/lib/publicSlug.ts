// DATEIUEBERSICHT: Generiert und stellt einen eindeutigen oeffentlichen Slug pro Benutzer sicher.
import { prisma } from "@/lib/prisma"

function slugify(value: string) {
    // Nur URL-freundliche Zeichen behalten.
    const cleaned = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

    return cleaned || "profile"
}

export async function ensureUserPublicSlug(userId: string, hint?: string | null) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { publicSlug: true, name: true, email: true },
    })

    if (!user) return null
    if (user.publicSlug) return user.publicSlug

    const baseHint = hint?.trim() || user.name || user.email.split("@")[0] || "profile"
    const base = slugify(baseHint).slice(0, 42)

    // Mehrere Versuche gegen Kollisionen bei bereits vergebenen Slugs.
    for (let attempt = 0; attempt < 30; attempt++) {
        const suffix = attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`
        const candidate = `${base}${suffix}`.slice(0, 50)

        try {
            const updated = await prisma.user.update({
                where: { id: userId },
                data: { publicSlug: candidate },
                select: { publicSlug: true },
            })
            return updated.publicSlug
        } catch {
            // Unique-Kollision: naechsten Kandidaten probieren.
        }
    }

    return null
}

