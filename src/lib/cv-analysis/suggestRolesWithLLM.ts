import { callOpenAiChat } from "@/lib/openai"

export type RoleSuggestion = {
    role: string
    score: number
    matched: string[]
    missing: string[]
    summary: string
}

export type SuggestRolesResult = {
    roles: RoleSuggestion[]
}

const MAX_SCORE = 100
const MIN_SCORE = 0

const normalizeArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0)
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return [value.trim()]
    }
    return []
}

const clampScore = (value: unknown): number => {
    const numeric = typeof value === "number" ? value : Number(value)
    if (Number.isNaN(numeric)) {
        return 0
    }
    if (numeric < MIN_SCORE) {
        return MIN_SCORE
    }
    if (numeric > MAX_SCORE) {
        return MAX_SCORE
    }
    return Math.round(numeric)
}

const parseRole = (item: unknown): RoleSuggestion | null => {
    if (typeof item !== "object" || item === null) {
        return null
    }

    const entry = item as Record<string, unknown>
    const role = typeof entry.role === "string" ? entry.role.trim() : ""
    if (!role) {
        return null
    }

    return {
        role,
        score: clampScore(entry.score),
        matched: normalizeArray(entry.matched),
        missing: normalizeArray(entry.missing),
        summary: typeof entry.summary === "string" ? entry.summary.trim() : "",
    }
}

const FALLBACK_ROLES: RoleSuggestion[] = [
    {
        role: "Generalist",
        score: 50,
        matched: ["Problem Solving", "Team Collaboration"],
        missing: ["Role-specific depth"],
        summary: "Allgemeine Stärken liegen im Team und in agilen Prozessen, mehr Spezialisierung wäre hilfreich.",
    },
    {
        role: "Backend Developer",
        score: 45,
        matched: ["APIs", "Node.js"],
        missing: ["Testing", "Cloud-Deployment"],
        summary: "Solide Backend-Grundlagen, aber zusätzliche Erfahrung mit Testing/DevOps würde helfen.",
    },
]

const buildPrompt = (cvText: string) => ({
    prompt: [
        "You are an expert technical recruiter.",
        "Analyze a CV and suggest the most suitable job roles.",
        "Return only valid JSON.",
    ].join(" "),
    question: [
        "CV Text:",
        cvText.trim(),
        "",
        "Instructions:",
        "1. Identify the candidate's profile.",
        "2. Suggest up to 3 fitting job roles.",
        "3. For each role, estimate a match score (0-100), list matched skills, list missing important skills, and provide a short explanation.",
        "4. Respond strictly with JSON in the format {\"roles\": [{\"role\": \"...\", \"score\": ..., \"matched\": [...], \"missing\": [...], \"summary\": \"...\"}] }.",
        "5. No extra text, markdown, or explanation outside JSON.",
    ].join("\n"),
})

export async function suggestRolesWithLLM(cvText: string): Promise<SuggestRolesResult> {
    const trimmedCv = cvText.trim()
    if (!trimmedCv) {
        return { roles: FALLBACK_ROLES }
    }

    const { prompt, question } = buildPrompt(trimmedCv)

    try {
        const ai = await callOpenAiChat({
            prompt,
            question,
            temperature: 0,
            timeoutMs: 30_000,
        })

        if (!ai.ok || !ai.content) {
            console.warn("[suggestRolesWithLLM] OpenAI call failed", ai.error)
            return { roles: FALLBACK_ROLES }
        }

        const parsed = JSON.parse(ai.content)
        if (!parsed || typeof parsed !== "object") {
            throw new Error("Invalid JSON structure")
        }

        const roles = Array.isArray(parsed.roles)
            ? parsed.roles.map(parseRole).filter((item): item is RoleSuggestion => Boolean(item))
            : []

        if (roles.length === 0) {
            throw new Error("No roles returned")
        }

        return { roles }
    } catch (error) {
        console.error("[suggestRolesWithLLM]", error)
        return { roles: FALLBACK_ROLES }
    }
}
