export type InterviewQuestion = {
    id: string
    text: string
    priority: number
}
//Question Pool

//TODO: durch DB ersetzen (später)
const GENERAL_QUESTIONS: InterviewQuestion[] = [
    {
        id: "motivation",
        text: "Warum passt diese Rolle aus deiner Sicht gut zu dir, und in welchem technischen Umfeld lieferst du erfahrungsgemaess den groessten Wert?",
        priority: 10,
    },
    {
        id: "project-impact",
        text: "Erzaehl mir von einem Projekt im Produkt-, B2B- oder Industrieumfeld, auf das du stolz bist. Was war dein konkreter Beitrag, welche technische Entscheidung war wichtig und welches Ergebnis gab es?",
        priority: 20,
    },
    {
        id: "delivery-under-pressure",
        text: "Wenn ein wichtiges Feature unter Zeitdruck live gehen muss, wie priorisierst du Qualitaet, Risiko und Liefergeschwindigkeit ganz konkret?",
        priority: 30,
    },
    {
        id: "feedback",
        text: "Erzaehl mir von einer Situation, in der du bei einer technischen Entscheidung Widerspruch bekommen hast. Wie bist du damit umgegangen und was war am Ende das Ergebnis?",
        priority: 40,
    },
]

const GENERAL_INTERN_QUESTIONS: InterviewQuestion[] = [
    {
        id: "intern-motivation",
        text: "Warum interessiert dich gerade ein Fullstack-Praktikum, und was willst du in so einer Rolle in den naechsten Monaten konkret lernen?",
        priority: 10,
    },
    {
        id: "intern-project-walkthrough",
        text: "Erzaehl mir von einem Studien-, Freizeit- oder Nebenprojekt, auf das du stolz bist. Was hast du selbst umgesetzt, welche Technologien hast du verwendet und was ist am Ende dabei herausgekommen?",
        priority: 20,
    },
    {
        id: "intern-teamwork",
        text: "Beschreibe eine Situation aus einem Projekt oder Team, in der ihr unterschiedliche Meinungen hattet oder etwas nicht rund lief. Wie hast du kommuniziert und was war dein Beitrag zur Loesung?",
        priority: 30,
    },
    {
        id: "intern-learning-curve",
        text: "Wenn du fuer ein Projekt kurzfristig eine Technologie lernen musstest, die du noch nicht gut kanntest: Wie bist du vorgegangen, wie schnell bist du reingekommen und was hat dir geholfen?",
        priority: 40,
    },
]

const ROLE_QUESTIONS: Record<string, InterviewQuestion[]> = {
    backend: [
        {
            id: "backend-api-design-tradeoffs",
            text: "Du baust fuer ein Produktteam in Linz eine API, die von mehreren Clients genutzt wird. Wie schneidest du Endpunkte, Validierung, Fehlerbehandlung und Versionierung so, dass sie wartbar bleiben?",
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
            text: "Wie wuerdest du ein neues Backend-Feature deployen und beobachten, damit Probleme nach dem Release frueh sichtbar werden?",
            priority: 60,
        },
    ],
    frontend: [
        {
            id: "frontend-state-architecture",
            text: "Wie entscheidest du in einer komplexeren Frontend-Anwendung, welcher State lokal bleibt, was global wird und wie du Komponenten fuer ein wartbares B2B-UI schneidest?",
            priority: 15,
        },
        {
            id: "frontend-performance-debugging",
            text: "Eine Seite wirkt spuerbar langsam oder ruckelt bei echten Nutzern. Was pruefst du zuerst, wie grenzt du die Ursache ein und welche Loesungen priorisierst du?",
            priority: 35,
        },
        {
            id: "frontend-api-error-handling",
            text: "Wie baust du Loading-, Error- und Empty-States so, dass eine produktive Anwendung auch bei instabilen APIs sauber benutzbar bleibt?",
            priority: 50,
        },
        {
            id: "frontend-quality-release",
            text: "Wie stellst du vor einem Frontend-Release sicher, dass wichtige Flows stabil bleiben, ohne bei jeder Aenderung alles manuell zu testen?",
            priority: 60,
        },
    ],
    fullstack: [
        {
            id: "fullstack-feature-slicing",
            text: "Wenn du ein Fullstack-Feature fuer ein Produktteam umsetzen sollst, wie schneidest du Frontend, Backend und Datenmodell so, dass ihr schnell liefern koennt, ohne euch technische Schulden einzuhandeln?",
            priority: 15,
        },
        {
            id: "fullstack-end-to-end-debugging",
            text: "Ein Feature funktioniert lokal, aber nicht sauber im produktiven Zusammenspiel von UI, API und Infrastruktur. Wie gehst du end-to-end bei der Analyse vor?",
            priority: 35,
        },
        {
            id: "fullstack-prioritization",
            text: "Wenn Scope, Zeit und technische Qualitaet kollidieren, wie priorisierst du bei einem Fullstack-Feature und wie kommunizierst du die Trade-offs?",
            priority: 50,
        },
        {
            id: "fullstack-release-ownership",
            text: "Was gehoert fuer dich dazu, ein Feature wirklich end-to-end zu verantworten, von der Anforderung bis zum Verhalten nach dem Release?",
            priority: 60,
        },
    ],
    data: [
        {
            id: "data-quality-trust",
            text: "Wie stellst du in einem produktiven Data- oder AI-Setup sicher, dass Datenqualitaet, Nachvollziehbarkeit und Vertrauen in die Ergebnisse nicht nur auf dem Papier existieren?",
            priority: 15,
        },
        {
            id: "data-evaluation-in-production",
            text: "Woran erkennst du, ob ein Modell oder eine Analyse im echten Betrieb wirklich nuetzlich ist, und welche Metriken oder Feedbackschleifen nutzt du dafuer?",
            priority: 35,
        },
        {
            id: "data-pipeline-reliability",
            text: "Wie gehst du vor, wenn eine Datenpipeline instabil ist oder Ergebnisse ploetzlich nicht mehr plausibel wirken?",
            priority: 50,
        },
        {
            id: "data-stakeholder-communication",
            text: "Wie erklaerst du Unsicherheit, Limitationen oder Qualitaetsrisiken gegenueber Product, Fachbereich oder Management, ohne zu sehr zu vereinfachen?",
            priority: 60,
        },
    ],
}

const FULLSTACK_INTERN_QUESTIONS: InterviewQuestion[] = [
    {
        id: "fullstack-intern-end-to-end-project",
        text: "Nimm ein eigenes Projekt, bei dem Frontend und Backend zusammenspielen. Wie lief der Request von der UI ueber die API bis zu den Daten, und wo lag dein konkreter Beitrag?",
        priority: 15,
    },
    {
        id: "fullstack-intern-debugging",
        text: "Stell dir vor, ein Formular funktioniert im Frontend, aber die Daten kommen im Backend nicht sauber an. Wie wuerdest du das Schritt fuer Schritt eingrenzen, bevor du etwas aenderst?",
        priority: 35,
    },
    {
        id: "fullstack-intern-prioritization",
        text: "In einem kleinen Startup-Team sollst du fuer ein Praktikum ein kleines Feature liefern, aber Zeit und Wissen sind knapp. Wie entscheidest du, was zuerst fertig sein muss, und wann holst du aktiv Hilfe dazu?",
        priority: 50,
    },
    {
        id: "fullstack-intern-feedback",
        text: "Wie gehst du damit um, wenn du in einem Code Review oder von einem Mentor kritisches Feedback zu deinem Code oder deiner Herangehensweise bekommst?",
        priority: 60,
    },
    {
        id: "fullstack-intern-user-focus",
        text: "Wie stellst du bei einem studentischen oder kleinen Produkt-Feature sicher, dass nicht nur der Code laeuft, sondern die Loesung fuer Nutzer oder das Team wirklich hilfreich ist?",
        priority: 70,
    },
]

const REGIONAL_TECH_CONTEXT =
    "Fokus auf typische Tech-Rollen in Oesterreich mit Naehe zu Linz und Wien: produktnahe Teams, B2B-Software, Startup- und Scale-up-Umfelder, Industrie- und Enterprise-Kontext, pragmatische Zusammenarbeit, saubere Releases, Debugging in produktiven Systemen und nachvollziehbare Projektbeitraege."

function isInternshipRole(role: string) {
    const normalized = role.toLowerCase()
    return normalized.includes("praktik") || normalized.includes("intern")
}

function getRoleBucket(role: string) {
    const normalized = role.toLowerCase()

    if (normalized.includes("frontend")) return "frontend"
    if (normalized.includes("fullstack")) return "fullstack"
    if (normalized.includes("data") || normalized.includes("ai")) return "data"

    return "backend"
}

export function getInterviewQuestionPool(role: string) {
    const bucket = getRoleBucket(role)
    const generalQuestions = isInternshipRole(role) ? GENERAL_INTERN_QUESTIONS : GENERAL_QUESTIONS
    const roleQuestions = isInternshipRole(role) && bucket === "fullstack" ? FULLSTACK_INTERN_QUESTIONS : (ROLE_QUESTIONS[bucket] ?? [])

    return [...generalQuestions, ...roleQuestions].sort((left, right) => left.priority - right.priority)
}

export function getRegionalTechContextGuidance() {
    return REGIONAL_TECH_CONTEXT
}

export function formatCountdown(secondsLeft: number) {
    const minutes = Math.floor(secondsLeft / 60)
    const seconds = secondsLeft % 60

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
