export type InterviewQuestion = {
    id: string
    text: string
    priority: number
}
//Question Pool
//TODO: besseres System der Priorisierung
const GENERAL_QUESTIONS: InterviewQuestion[] = [
    {
        id: "motivation",
        text: "Warum passt diese Rolle aus deiner Sicht gut zu dir, und in welchem technischen Umfeld lieferst du erfahrungsgemäß den größten Wert?",
        priority: 10,
    },
    {
        id: "project-impact",
        text: "Erzähl mir von einem Projekt im Produkt-, B2B- oder Industrieumfeld, auf das du stolz bist. Was war dein konkreter Beitrag, welche technische Entscheidung war wichtig und welches Ergebnis gab es?",
        priority: 20,
    },
    {
        id: "delivery-under-pressure",
        text: "Wenn ein wichtiges Feature unter Zeitdruck live gehen muss, wie priorisierst du Qualität, Risiko und Liefergeschwindigkeit ganz konkret?",
        priority: 30,
    },
    {
        id: "feedback",
        text: "Erzähl mir von einer Situation, in der du bei einer technischen Entscheidung Widerspruch bekommen hast. Wie bist du damit umgegangen und was war am Ende das Ergebnis?",
        priority: 40,
    },
]

const ROLE_QUESTIONS: Record<string, InterviewQuestion[]> = {
    backend: [
        {
            id: "backend-api-design-tradeoffs",
            text: "Du baust für ein Produktteam in Linz eine API, die von mehreren Clients genutzt wird. Wie schneidest du Endpunkte, Validierung, Fehlerbehandlung und Versionierung so, dass sie wartbar bleiben?",
            priority: 15,
        },
        {
            id: "backend-production-debugging",
            text: "Ein Backend-Feature schlaegt in Produktion nur sporadisch fehl. Wie gehst du bei Logs, Metriken, Reproduktion und Eingrenzung vor, ohne blind auf Verdacht zu patchen?",
            priority: 35,
        },
        {
            id: "backend-data-consistency",
            text: "Wie stellst du bei konkurrierenden Requests oder Hintergrundjobs sicher, dass Daten konsistent bleiben und es keine stillen Seiteneffekte gibt?",
            priority: 50,
        },
        {
            id: "backend-deployment-observability",
            text: "Wie würdest du ein neues Backend-Feature deployen und beobachten, damit Probleme nach dem Release früh sichtbar werden?",
            priority: 60,
        },
    ],
    frontend: [
        {
            id: "frontend-state-architecture",
            text: "Wie entscheidest du in einer komplexeren Frontend-Anwendung, welcher State lokal bleibt, was global wird und wie du Komponenten für ein wartbares B2B-UI schneidest?",
            priority: 15,
        },
        {
            id: "frontend-performance-debugging",
            text: "Eine Seite wirkt spürbar langsam oder ruckelt bei echten Nutzern. Was prüfst du zuerst, wie grenzt du die Ursache ein und welche Lösungen priorisierst du?",
            priority: 35,
        },
        {
            id: "frontend-api-error-handling",
            text: "Wie baust du Loading-, Error- und Empty-States so, dass eine produktive Anwendung auch bei instabilen APIs sauber benutzbar bleibt?",
            priority: 50,
        },
        {
            id: "frontend-quality-release",
            text: "Wie stellst du vor einem Frontend-Release sicher, dass wichtige Flows stabil bleiben, ohne bei jeder Änderung alles manuell zu testen?",
            priority: 60,
        },
    ],
    fullstack: [
        {
            id: "fullstack-feature-slicing",
            text: "Wenn du ein Fullstack-Feature für ein Produktteam umsetzen sollst, wie schneidest du Frontend, Backend und Datenmodell so, dass ihr schnell liefern könnt, ohne euch technische Schulden einzuhandeln?",
            priority: 15,
        },
        {
            id: "fullstack-end-to-end-debugging",
            text: "Ein Feature funktioniert lokal, aber nicht sauber im produktiven Zusammenspiel von UI, API und Infrastruktur. Wie gehst du end-to-end bei der Analyse vor?",
            priority: 35,
        },
        {
            id: "fullstack-prioritization",
            text: "Wenn Scope, Zeit und technische Qualität kollidieren, wie priorisierst du bei einem Fullstack-Feature und wie kommunizierst du die Trade-offs?",
            priority: 50,
        },
        {
            id: "fullstack-release-ownership",
            text: "Was gehört für dich dazu, ein Feature wirklich end-to-end zu verantworten, von der Anforderung bis zum Verhalten nach dem Release?",
            priority: 60,
        },
    ],
    data: [
        {
            id: "data-quality-trust",
            text: "Wie stellst du in einem produktiven Data- oder AI-Setup sicher, dass Datenqualität, Nachvollziehbarkeit und Vertrauen in die Ergebnisse nicht nur auf dem Papier existieren?",
            priority: 15,
        },
        {
            id: "data-evaluation-in-production",
            text: "Woran erkennst du, ob ein Modell oder eine Analyse im echten Betrieb wirklich nützlich ist, und welche Metriken oder Feedbackschleifen nutzt du dafür?",
            priority: 35,
        },
        {
            id: "data-pipeline-reliability",
            text: "Wie gehst du vor, wenn eine Datenpipeline instabil ist oder Ergebnisse plötzlich nicht mehr plausibel wirken?",
            priority: 50,
        },
        {
            id: "data-stakeholder-communication",
            text: "Wie erklärst du Unsicherheit, Limitationen oder Qualitätsrisiken gegenüber Product, Fachbereich oder Management, ohne zu sehr zu vereinfachen?",
            priority: 60,
        },
    ],
}

const REGIONAL_TECH_CONTEXT =
    "Fokus auf typische Tech-Rollen in Österreich mit Nähe zu Linz und Wien: produktnahe Teams, B2B-Software, Startup- und Scale-up-Umfelder, Industrie- und Enterprise-Kontext, pragmatische Zusammenarbeit, saubere Releases, Debugging in produktiven Systemen und nachvollziehbare Projektbeiträge."

function getRoleBucket(role: string) {
    const normalized = role.toLowerCase()

    if (normalized.includes("frontend")) return "frontend"
    if (normalized.includes("fullstack")) return "fullstack"
    if (normalized.includes("data") || normalized.includes("ai")) return "data"

    return "backend"
}

export function getInterviewQuestionPool(role: string) {
    const bucket = getRoleBucket(role)
    const roleQuestions = ROLE_QUESTIONS[bucket] ?? []

    return [...GENERAL_QUESTIONS, ...roleQuestions].sort((left, right) => left.priority - right.priority)
}

export function getRegionalTechContextGuidance() {
    return REGIONAL_TECH_CONTEXT
}

export function formatCountdown(secondsLeft: number) {
    const minutes = Math.floor(secondsLeft / 60)
    const seconds = secondsLeft % 60

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
