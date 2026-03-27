import { GoogleGenAI, MediaResolution, Modality } from "@google/genai"
import { getInterviewQuestionPool, getRegionalTechContextGuidance } from "@/lib/interview"

export const runtime = "nodejs"

const LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"
const LIVE_VOICE = "Zephyr"
const LIVE_SESSION_TTL_MS = 6 * 60 * 1000

type LiveTokenBody = {
    role?: string
}

function getRoleInterviewGuidance(role: string) {
    const normalized = role.toLowerCase()

    if (normalized.includes("fullstack") && (normalized.includes("praktik") || normalized.includes("intern"))) {
        return "Fokussiere bei Fullstack-Praktika staerker auf Studien- oder Freizeitprojekte, Lernkurve, saubere Kommunikation im Team, Umgang mit Feedback, pragmatisches Debugging und verstaendliche Erklaerungen des eigenen Beitrags."
    }

    return "Fokussiere auf konkrete technische Entscheidungen, nachvollziehbare Beispiele, klaren Eigenbeitrag und saubere Kommunikation."
}

function createSystemInstruction(role: string) {
    const questionPlan = getInterviewQuestionPool(role)
    const serializedPlan = questionPlan.map((question, index) => `${index + 1}. [${question.id}] ${question.text}`).join("\n")

    return [
        "Du bist ein professioneller, deutschsprachiger Interviewer in einem technischen Live-Interview.",
        `Die Zielrolle ist: ${role}.`,
        "Das Interview ist ein kurzer Techniktest von ungefaehr 5 Minuten Gesamtdauer.",
        "Du fuehrst strukturiert durch das Interview, stellst immer nur eine klare Frage auf einmal und bleibst knapp.",
        "Du sprichst ausschliesslich Deutsch.",
        "Du verhaeltst dich wie ein echter Interviewer und nicht wie ein Coach oder Assistent.",
        "Der Host uebernimmt Begruessung, erste fixe Kernfrage, die Abschlussphase in der letzten Minute und die Verabschiedung.",
        "Sprich nie eine Begruessung oder Verabschiedung selbst aus.",
        "Wenn das Interview in die Abschlussphase geht, stellst du keine zusaetzliche Abschlussfrage und keine Zusammenfassung aus eigener Initiative.",
        "Wenn die erste Kernfrage bereits vom Host gestellt wurde, wartest du auf die Kandidatenantwort und wiederholst diese erste Frage nicht.",
        "Nutze die Kernfragen bevorzugt in der vorgegebenen Reihenfolge. Stelle jede Kernfrage hoechstens einmal.",
        "Nach jeder Kandidatenantwort entscheidest du zwischen genau zwei Optionen: eine kurze Rueckfrage oder die naechste offene Kernfrage.",
        "Stelle maximal eine Rueckfrage pro Kernfrage, ausser die Antwort ist komplett ausweichend oder unverstaendlich.",
        "Wenn der Kandidat unklar, generisch oder zu kurz bleibt, frage gezielt nach einem konkreten Beispiel, einer technischen Entscheidung, einem Trade-off oder einem Ergebnis.",
        "Wenn die Antwort brauchbar und konkret ist, gehe ohne Umwege zur naechsten Kernfrage weiter.",
        "Unterbrich den Kandidaten nicht absichtlich. Bei kurzen Pausen wartest du kurz, statt sofort zu sprechen.",
        "Halte eigene Antworten knapp: meistens 1 bis 2 kurze Saetze plus genau eine Frage.",
        "Der ausgegebene Textkanal muss den gesprochenen Interviewerinhalt wortgleich wiedergeben.",
        `Rollenspezifischer Interviewfokus: ${getRoleInterviewGuidance(role)}`,
        getRegionalTechContextGuidance(),
        "Vorgesehene Kernfragen fuer dieses Interview:",
        serializedPlan,
    ].join("\n")
}

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
        return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 })
    }

    const body = (await req.json().catch(() => ({}))) as LiveTokenBody
    const role = body.role?.trim() || "Backend Developer"

    try {
        const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
                apiVersion: "v1alpha",
            },
        })

        const now = Date.now()
        const newSessionExpireTime = new Date(now + LIVE_SESSION_TTL_MS).toISOString()

        const token = await ai.authTokens.create({
            config: {
                uses: 1,
                newSessionExpireTime,
                liveConnectConstraints: {
                    model: LIVE_MODEL,
                    config: {
                        responseModalities: [Modality.AUDIO],
                        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: LIVE_VOICE,
                                },
                            },
                        },
                        systemInstruction: createSystemInstruction(role),
                    },
                },
                lockAdditionalFields: [],
            },
        })

        if (!token.name) {
            return Response.json({ error: "Gemini auth token creation returned no token" }, { status: 502 })
        }

        return Response.json({
            token: token.name,
            model: LIVE_MODEL,
            voiceName: LIVE_VOICE,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gemini token creation failed"
        return Response.json({ error: message }, { status: 502 })
    }
}
