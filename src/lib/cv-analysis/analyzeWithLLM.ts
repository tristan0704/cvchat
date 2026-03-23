import { callOpenAiChat } from "@/lib/openai"

export type JobProfile = {
    role: string
    must_have: string[]
    nice_to_have?: string[]
    bonus?: string[]
}

export type CvAnalysisResult = {
    score: number
    matched: string[]
    missing_must_have: string[]
    nice_to_have_matches: string[]
    bonus_matches: string[]
    summary: string
}

const arrayOrEmpty = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return [value.trim()]
    }
    return []
}

const profileListToText = (items?: readonly string[]): string =>
    items && items.length ? items.join(", ") : "keine Angaben"

export async function analyzeWithLLM(cvText: string, jobProfile: JobProfile): Promise<CvAnalysisResult> {
    const trimmedCv = cvText.trim()
    const prompt = [
        "Du bist ein auf Hiring spezialisierter Assistant.",
        "Extrahiere relevante Skills aus dem CV.",
        "Vergleiche die gefundenen Skills mit dem Jobprofil (Must-haves, Nice-to-haves, Bonus).",
        "Gib eine eindeutige JSON-Antwort zurück, ohne zusätzliche Erklärungen.",
        "Die Antwort muss genau die folgenden Felder enthalten: score (Zahl), matched (Liste Strings), missing_must_have (Liste Strings), nice_to_have_matches (Liste Strings), bonus_matches (Liste Strings), summary (String).",
    ].join("\n")

    const question = [
        `Jobprofil:`,
        `Rolle: ${jobProfile.role}`,
        `Must-haves: ${profileListToText(jobProfile.must_have)}`,
        `Nice-to-haves: ${profileListToText(jobProfile.nice_to_have)}`,
        `Bonus: ${profileListToText(jobProfile.bonus)}`,
        ``,
        `CV-Inhalt:`,
        trimmedCv,
    ].join("\n")

    console.log("[analyzeWithLLM] final prompt", prompt)
    console.log("[analyzeWithLLM] question payload preview", question.slice(0, 500))

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        console.warn("[analyzeWithLLM] OPENAI_API_KEY missing, returning mock analysis")
        return {
            score: 50,
            matched: jobProfile.must_have.slice(0, 1),
            missing_must_have: jobProfile.must_have.slice(),
            nice_to_have_matches: jobProfile.nice_to_have ? jobProfile.nice_to_have.slice(0, 2) : [],
            bonus_matches: jobProfile.bonus ? jobProfile.bonus.slice(0, 1) : [],
            summary: `Mock analysis for role ${jobProfile.role}.`,
        }
    }

    const ai = await callOpenAiChat({
        prompt,
        question,
        temperature: 0,
        timeoutMs: 30_000,
    })
    console.log("[analyzeWithLLM] OpenAI response start", ai.content?.slice(0, 300))

    if (!ai.ok) {
        throw new Error(ai.error ?? "OpenAI call failed")
    }

    const parsed = JSON.parse(ai.content)

    return {
        score: Number(parsed.score ?? 0),
        matched: arrayOrEmpty(parsed.matched),
        missing_must_have: arrayOrEmpty(parsed.missing_must_have),
        nice_to_have_matches: arrayOrEmpty(parsed.nice_to_have_matches),
        bonus_matches: arrayOrEmpty(parsed.bonus_matches),
        summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    }
}
