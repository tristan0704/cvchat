import { PublishedSnapshot } from "@/lib/cvPublishing"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
    return value && typeof value === "object" ? (value as UnknownRecord) : {}
}

function asString(value: unknown) {
    return typeof value === "string" ? value : ""
}

function asStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

type MetaLike = {
    name?: string
    position?: string
    summary?: string
    imageUrl?: string | null
}

export function buildProfileFromCvData(cvData: unknown, meta?: MetaLike) {
    const cv = asRecord(cvData)
    const person = asRecord(cv.person)

    const experienceRaw = Array.isArray(cv.experience) ? cv.experience : []
    const experience = experienceRaw.map((item) => {
        const row = asRecord(item)
        return {
            organization: asString(row.organization),
            role: asString(row.role),
            start: asString(row.start),
            end: asString(row.end),
            responsibilities: asStringArray(row.tasks),
            keywords: asStringArray(row.keywords),
        }
    })

    const projectsRaw = Array.isArray(cv.projects) ? cv.projects : []
    const projects = projectsRaw.map((item) => {
        const row = asRecord(item)
        return {
            name: asString(row.name),
            role: asString(row.role),
            summary: asString(row.summary),
            impact: asString(row.impact),
            tech: asStringArray(row.tech),
            links: asStringArray(row.links),
        }
    })

    return {
        person: {
            name: asString(person.name) || meta?.name || "",
            title: asString(person.title) || meta?.position || "",
            location: asString(person.location),
            summary: asString(person.summary) || meta?.summary || "",
        },
        skills: asStringArray(cv.skills),
        experience,
        projects,
        education: Array.isArray(cv.education) ? cv.education : [],
        languages: Array.isArray(cv.languages) ? cv.languages : [],
    }
}

export function buildPublicProfile(snapshot: PublishedSnapshot) {
    const profileData = buildProfileFromCvData(snapshot.cv, snapshot.meta)

    return {
        meta: snapshot.meta,
        profile: {
            ...profileData,
            certificates: snapshot.certificates,
        },
        sources: {
            references: snapshot.references,
            additionalText: snapshot.additionalText,
        },
    }
}

export function buildStructuredChatContext(snapshot: PublishedSnapshot) {
    const profile = buildPublicProfile(snapshot)
    return {
        candidate: profile.profile.person,
        skills: profile.profile.skills,
        experience: profile.profile.experience,
        projects: profile.profile.projects,
        education: profile.profile.education,
        languages: profile.profile.languages,
        certificates: profile.profile.certificates,
        additionalEvidence: {
            references: profile.sources.references,
            additionalText: profile.sources.additionalText,
        },
    }
}
