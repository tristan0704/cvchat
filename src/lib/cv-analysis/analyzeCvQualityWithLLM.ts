import { callOpenAiChat } from "@/lib/openai"

export type CvQualityAI = {
    overallScore: number
    sections: {
        score: number
        feedback: string
    }
    impact: {
        score: number
        feedback: string
    }
    length: {
        score: number
        feedback: string
    }
    contact: {
        score: number
        feedback: string
    }
    clarity: {
        score: number
        feedback: string
    }
    improvements: string[]
}

const FALLBACK_FEEDBACK = "Unable to analyze content."

const FALLBACK_RESULT: CvQualityAI = {
    overallScore: 50,
    sections: { score: 50, feedback: "Unable to analyze sections." },
    impact: { score: 50, feedback: "Unable to analyze impact." },
    length: { score: 50, feedback: "Unable to analyze length." },
    contact: { score: 50, feedback: "Unable to analyze contact info." },
    clarity: { score: 50, feedback: "Unable to analyze clarity." },
    improvements: ["Analysis unavailable"],
}

const clampScore = (value: unknown): number => {
    const numeric = typeof value === "number" ? value : Number(value)
    if (Number.isNaN(numeric)) {
        return 50
    }
    if (numeric < 0) return 0
    if (numeric > 100) return 100
    return Math.round(numeric)
}

const parseDimension = (value: unknown): { score: number; feedback: string } => {
    if (!value || typeof value !== "object") {
        return { score: 50, feedback: FALLBACK_FEEDBACK }
    }

    const entry = value as Record<string, unknown>
    const score = clampScore(entry.score)
    const feedback = typeof entry.feedback === "string" && entry.feedback.trim().length > 0 ? entry.feedback.trim() : FALLBACK_FEEDBACK
    return { score, feedback }
}

const buildPrompt = (cvText: string) => ({
    prompt: [
        "You are an experienced recruiter and career coach.",
        "Analyze the given CV holistically.",
        "Do NOT rely on exact keywords — interpret meaning and structure.",
        "Evaluate the CV across the following dimensions:",
        "* Sections (structure & completeness)",
        "* Impact (measurable achievements)",
        "* Length (appropriateness)",
        "* Contact information (completeness)",
        "* Clarity (how well experience is described)",
        "Return ONLY valid JSON with no explanation.",
    ].join(" "),
    question: [
        "CV CONTENT:",
        cvText,
        "",
        "Return JSON in this exact format:",
        "{",
        '"overallScore": number (0-100),',
        '"sections": { "score": number, "feedback": string },',
        '"impact": { "score": number, "feedback": string },',
        '"length": { "score": number, "feedback": string },',
        '"contact": { "score": number, "feedback": string },',
        '"clarity": { "score": number, "feedback": string },',
        '"improvements": string[]',
        "}",
        "",
        "Rules:",
        "* Be concise but helpful",
        "* Give actionable feedback",
        "* Do not hallucinate missing data",
        "* Infer sections even if named differently",
    ].join("\n"),
})

export async function analyzeCvQualityWithLLM(cvText: string): Promise<CvQualityAI> {
    const trimmed = cvText.trim()
    if (!trimmed) {
        return FALLBACK_RESULT
    }

    const { prompt, question } = buildPrompt(trimmed)

    try {
        const ai = await callOpenAiChat({
            prompt,
            question,
            temperature: 0,
            timeoutMs: 30_000,
        })

        if (!ai.ok || !ai.content) {
            console.warn("[analyzeCvQualityWithLLM] OpenAI call failed", ai.error)
            return FALLBACK_RESULT
        }

        const parsed = JSON.parse(ai.content)
        if (!parsed || typeof parsed !== "object") {
            throw new Error("Invalid JSON structure")
        }

        const sections = parseDimension(parsed.sections)
        const impact = parseDimension(parsed.impact)
        const length = parseDimension(parsed.length)
        const contact = parseDimension(parsed.contact)
        const clarity = parseDimension(parsed.clarity)
        const overallScore = clampScore(parsed.overallScore)

        const improvements = Array.isArray(parsed.improvements)
            ? parsed.improvements
                  .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
                  .map((item) => item.trim())
            : []

        return {
            overallScore,
            sections,
            impact,
            length,
            contact,
            clarity,
            improvements: improvements.length > 0 ? improvements : ["No specific improvements provided."],
        }
    } catch (error) {
        console.error("[analyzeCvQualityWithLLM]", error)
        return FALLBACK_RESULT
    }
}
