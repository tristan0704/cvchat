export type CvQualityAnalysis = {
    length: {
        wordCount: number
        status: "too_short" | "good" | "too_long"
    }
    sections: {
        hasExperience: boolean
        hasEducation: boolean
        hasSkills: boolean
    }
    contact: {
        hasEmail: boolean
        hasPhone: boolean
        hasLinkedIn: boolean
    }
    quantifyImpact: {
        totalBullets: number
        bulletsWithNumbers: number
    }
    repetition: {
        repeatedWords: string[]
    }
    weakBullets: {
        weakCount: number
    }
}

const ACTION_VERBS = new Set([
    "led",
    "built",
    "created",
    "designed",
    "developed",
    "implemented",
    "launched",
    "owned",
    "managed",
    "optimized",
    "automated",
    "improved",
    "analyzed",
    "collaborated",
    "guided",
    "coordinated",
    "orchestrated",
    "delivered",
])

const defaultQuality: CvQualityAnalysis = {
    length: {
        wordCount: 0,
        status: "too_short",
    },
    sections: {
        hasExperience: false,
        hasEducation: false,
        hasSkills: false,
    },
    contact: {
        hasEmail: false,
        hasPhone: false,
        hasLinkedIn: false,
    },
    quantifyImpact: {
        totalBullets: 0,
        bulletsWithNumbers: 0,
    },
    repetition: {
        repeatedWords: [],
    },
    weakBullets: {
        weakCount: 0,
    },
}

const impactRegex = /\d+%|\d+\+|\d+\s?(users|clients|projects|years|people)/i

const wordRegex = /\b[a-z0-9']+\b/gi

const countRepeatedWords = (text: string): string[] => {
    const matches = text.toLowerCase().match(wordRegex) ?? []
    const frequency: Record<string, number> = {}
    for (const match of matches) {
        if (match.length < 3) continue
        const next = frequency[match] ?? 0
        frequency[match] = next + 1
    }

    return Object.entries(frequency)
        .filter(([, count]) => count > 10)
        .map(([word]) => word)
        .slice(0, 10)
}

const determineLengthStatus = (wordCount: number): CvQualityAnalysis["length"]["status"] => {
    if (wordCount < 250) {
        return "too_short"
    }
    if (wordCount > 700) {
        return "too_long"
    }
    return "good"
}

export function analyzeCvQuality(cvText: string): CvQualityAnalysis {
    const trimmed = cvText.trim()
    if (!trimmed) {
        return defaultQuality
    }

    const words = trimmed.split(/\s+/).filter(Boolean)
    const wordCount = words.length

    const contactText = trimmed
    const length = {
        wordCount,
        status: determineLengthStatus(wordCount),
    }

    const sections = {
        hasExperience: /experience/i.test(trimmed),
        hasEducation: /education/i.test(trimmed),
        hasSkills: /skills/i.test(trimmed),
    }

    const contact = {
        hasEmail: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(contactText),
        hasPhone: /\+?\d[\d\s-]{6,}\d/.test(contactText),
        hasLinkedIn: /linkedin\.com/i.test(contactText),
    }

    const bullets = trimmed
        .split(/\n|•/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

    const quantifyImpact = {
        totalBullets: bullets.length,
        bulletsWithNumbers: bullets.filter((bullet) => impactRegex.test(bullet)).length,
    }

    let weakCount = 0
    for (const bullet of bullets) {
        const bulletWords = bullet.split(/\s+/).filter(Boolean)
        const startsWithAction = bulletWords.length > 0 && ACTION_VERBS.has(bulletWords[0].toLowerCase())
        if (bulletWords.length < 8 || !startsWithAction) {
            weakCount += 1
        }
    }

    const repetition = {
        repeatedWords: countRepeatedWords(trimmed),
    }

    return {
        length,
        sections,
        contact,
        quantifyImpact,
        repetition,
        weakBullets: {
            weakCount,
        },
    }
}
