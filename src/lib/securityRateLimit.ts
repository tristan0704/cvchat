// DATEIUEBERSICHT: Einfacher In-Memory-Rate-Limiter zum Schuetzen von API-Endpunkten.
type RateLimitOptions = {
    windowMs: number
    max: number
}

type Bucket = {
    count: number
    resetAt: number
}

const globalForRateLimit = globalThis as typeof globalThis & {
    __htrRateLimitStore?: Map<string, Bucket>
}

const store =
    globalForRateLimit.__htrRateLimitStore ??
    (globalForRateLimit.__htrRateLimitStore = new Map<string, Bucket>())

function getClientIp(req: Request) {
    // x-forwarded-for kann mehrere IPs enthalten; wir nehmen die erste Client-IP.
    const xff = req.headers.get("x-forwarded-for")
    if (xff) return xff.split(",")[0]?.trim() || "unknown"
    return req.headers.get("x-real-ip")?.trim() || "unknown"
}

function cleanupExpired(now: number) {
    // Nur bei groesserem Store aufraeumen, um Overhead zu sparen.
    if (store.size < 2000) return
    for (const [key, bucket] of store.entries()) {
        if (bucket.resetAt <= now) store.delete(key)
    }
}

export function enforceRateLimit(
    req: Request,
    keyPrefix: string,
    options: RateLimitOptions
) {
    const now = Date.now()
    cleanupExpired(now)

    const key = `${keyPrefix}:${getClientIp(req)}`
    const existing = store.get(key)

    if (!existing || existing.resetAt <= now) {
        // Neues Zeitfenster starten.
        store.set(key, { count: 1, resetAt: now + options.windowMs })
        return null
    }

    existing.count += 1
    if (existing.count <= options.max) {
        return null
    }

    const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
    )

    // Standard-HTTP-429 plus Retry-After fuer Clients/Browser.
    return Response.json(
        { error: "Too many requests" },
        {
            status: 429,
            headers: { "Retry-After": String(retryAfterSeconds) },
        }
    )
}

