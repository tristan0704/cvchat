import { randomBytes } from "crypto"
import { Cv, CvMeta, Prisma } from "@prisma/client"

type CvWithContext = Cv & {
    meta: CvMeta | null
    certificates: { data: Prisma.JsonValue }[]
    references: { rawText: string }[]
    additionalText: { content: string }[]
}

export type PublishedSnapshot = {
    cv: Prisma.JsonValue
    meta: {
        name: string
        position: string
        summary: string
        imageUrl: string | null
    }
    certificates: Prisma.JsonValue[]
    references: string[]
    additionalText: string[]
}

export function createShareToken() {
    return randomBytes(18)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
}

export function buildPublishedSnapshot(cv: CvWithContext): PublishedSnapshot {
    return {
        cv: cv.data,
        meta: {
            name: cv.meta?.name ?? "",
            position: cv.meta?.position ?? "",
            summary: cv.meta?.summary ?? "",
            imageUrl: cv.meta?.imageUrl ?? null,
        },
        certificates: cv.certificates.map((item) => item.data),
        references: cv.references.map((item) => item.rawText),
        additionalText: cv.additionalText.map((item) => item.content),
    }
}
