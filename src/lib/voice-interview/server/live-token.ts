import "server-only"

import { GoogleGenAI, MediaResolution, Modality } from "@google/genai"

import {
  getInterviewQuestionPool,
  getRegionalTechContextGuidance,
} from "@/lib/questionpool"
import { normalizeLanguage } from "@/lib/i18n/dictionaries"

// ----------------------------
// Live-Session-Konfiguration
// ----------------------------

/**
 * Gemini Live-Modell für native Audio-Interviews.
 *
 * Wichtig:
 * Dieses Modell wird sowohl beim Token-Erstellen als auch später beim
 * Client-Live-Connect verwendet. Deshalb muss es mit dem Client-Flow
 * zusammenpassen.
 */
const LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"

/**
 * Feste Stimme für den Interviewer.
 */
const LIVE_VOICE = "Zephyr"

/**
 * Gültigkeitsdauer für neu erstellte Live-Sessions.
 *
 * 6 Minuten sind bewusst etwas länger als das eigentliche 5-Minuten-Interview,
 * damit kleine Startverzögerungen nicht sofort die Session killen.
 */
const LIVE_SESSION_TTL_MS = 6 * 60 * 1000

// ----------------------------
// Rollenspezifische Interview-Guidance
// ----------------------------

/**
 * Gibt zusätzliche Interview-Anweisungen abhängig von Zielrolle und Seniorität zurück.
 *
 * Zweck:
 * Das Interview soll für Praktika, Internships, Trainee- und Junior-Rollen fair bleiben.
 * Bei Early-Career-Rollen wird stärker auf Lernkurve, Grundlagenverständnis,
 * Kommunikation und konkrete Projektbeispiele geachtet statt auf Senior-Level-Tiefe.
 */
function getRoleInterviewGuidance(role: string) {
  const normalizedRole = role.toLowerCase()

  const isFrontendRole = normalizedRole.includes("frontend")
  const isBackendRole = normalizedRole.includes("backend")
  const isFullstackRole =
      normalizedRole.includes("fullstack") ||
      normalizedRole.includes("full-stack") ||
      normalizedRole.includes("full stack")

  const isEarlyCareerRole =
      normalizedRole.includes("praktik") ||
      normalizedRole.includes("intern") ||
      normalizedRole.includes("junior") ||
      normalizedRole.includes("trainee") ||
      normalizedRole.includes("entry")

  const seniorityGuidance = isEarlyCareerRole
      ? [
        "Berücksichtige, dass es sich um eine Early-Career-, Praktikums-, Internship- oder Junior-Rolle handeln kann.",
        "Bewerte deshalb nicht wie bei einem Senior-Interview, sondern achte stärker auf Lernkurve, Grundlagenverständnis, klare Kommunikation, Reflexionsfähigkeit, Umgang mit Feedback und nachvollziehbare Projektbeispiele.",
      ].join(" ")
      : [
        "Bewerte nicht nur Faktenwissen, sondern vor allem nachvollziehbare Entscheidungen, Projektverständnis, Eigenbeitrag, Kommunikation und technische Klarheit.",
      ].join(" ")

  if (isFullstackRole) {
    return [
      seniorityGuidance,
      "Fokussiere bei Fullstack-Rollen zusätzlich auf das Zusammenspiel von Frontend und Backend, API-Design, Datenfluss, Debugging, einfache Architekturentscheidungen und verständliche Trade-offs.",
    ].join(" ")
  }

  if (isFrontendRole) {
    return [
      seniorityGuidance,
      "Fokussiere bei Frontend-Rollen zusätzlich auf Komponentenstruktur, State Management, UI-Umsetzung, API-Integration, grundlegende Performance, Debugging und verständliche Erklärung von UI-Entscheidungen.",
    ].join(" ")
  }

  if (isBackendRole) {
    return [
      seniorityGuidance,
      "Fokussiere bei Backend-Rollen zusätzlich auf API-Design, Datenmodellierung, Datenbankzugriffe, Fehlerbehandlung, Security-Grundlagen, Performance-Basics und nachvollziehbare technische Entscheidungen.",
    ].join(" ")
  }

  return seniorityGuidance
}

// ----------------------------
// Question Plan serialisieren
// ----------------------------

/**
 * Wandelt den internen Question Plan in einen kompakten Textblock um.
 *
 * Beispiel:
 * 1. [project-experience] Erzähle von einem Projekt...
 * 2. [debugging] Wie gehst du beim Debugging vor?
 */
function serializeQuestionPlan(role: string) {
  const questionPlan = getInterviewQuestionPool(role)

  return questionPlan
      .map((question, index) => `${index + 1}. [${question.id}] ${question.text}`)
      .join("\n")
}

// ----------------------------
// System Prompt bauen
// ----------------------------

/**
 * Baut die System Instruction für das Live-Interview.
 *
 * Diese Instruction ist wichtig, weil sie das Modell begrenzt:
 * - deutschsprachig
 * - Interviewer, nicht Coach
 * - keine Begrüßung / Verabschiedung, weil das der Host übernimmt
 * - kurze Fragen
 * - maximal eine Rückfrage pro Kernfrage
 * - Question Plan bevorzugt in Reihenfolge
 */
function createSystemInstruction(role: string, language: unknown = "de") {
  const outputLanguage = normalizeLanguage(language)
  const serializedPlan = serializeQuestionPlan(role)
  const roleGuidance = getRoleInterviewGuidance(role)
  const regionalGuidance = getRegionalTechContextGuidance()

  if (outputLanguage === "en") {
    return [
      "You are a professional English-speaking interviewer in a technical live interview.",
      `The target role is: ${role}.`,
      "The interview is a short technical screening of about 5 minutes total.",
      "The internal question plan may contain German text; translate it naturally into English before speaking.",

      "",
      "Interview style:",
      "Lead the interview in a structured way, ask only one clear question at a time, and stay concise.",
      "Speak exclusively English.",
      "Act like a real interviewer, not like a coach or assistant.",
      "Keep your own responses short: usually 1 to 2 brief sentences plus exactly one question.",
      "The text output channel must match the spoken interviewer content exactly.",

      "",
      "Host boundaries:",
      "The host handles the greeting, the first fixed core question, the final-minute closing phase, and the farewell.",
      "Never speak a greeting or farewell yourself.",
      "When the interview enters the closing phase, do not ask an additional closing question and do not summarize on your own initiative.",
      "If the first core question has already been asked by the host, wait for the candidate's answer and do not repeat it.",

      "",
      "Question logic:",
      "Use the core questions preferably in the given order. Ask each core question at most once.",
      "After each candidate answer, choose exactly one of two options: a short follow-up or the next open core question.",
      "Ask at most one follow-up per core question unless the answer is completely evasive or unclear.",
      "If the candidate is vague, generic, or too brief, ask for a concrete example, technical decision, trade-off, or result.",
      "If the answer is useful and concrete, move directly to the next core question.",
      "Do not interrupt the candidate intentionally. During short pauses, wait briefly instead of speaking immediately.",

      "",
      `Role-specific interview focus: ${roleGuidance}`,
      regionalGuidance,

      "",
      "Planned core questions for this interview:",
      serializedPlan,
    ].join("\n")
  }

  return [
    "Du bist ein professioneller, deutschsprachiger Interviewer in einem technischen Live-Interview.",
    `Die Zielrolle ist: ${role}.`,
    "Das Interview ist ein kurzer Techniktest von ungefähr 5 Minuten Gesamtdauer.",

    "",
    "Interview-Stil:",
    "Du führst strukturiert durch das Interview, stellst immer nur eine klare Frage auf einmal und bleibst knapp.",
    "Du sprichst ausschließlich Deutsch.",
    "Du verhältst dich wie ein echter Interviewer und nicht wie ein Coach oder Assistent.",
    "Halte eigene Antworten knapp: meistens 1 bis 2 kurze Sätze plus genau eine Frage.",
    "Der ausgegebene Textkanal muss den gesprochenen Interviewerinhalt wortgleich wiedergeben.",

    "",
    "Host-Abgrenzung:",
    "Der Host übernimmt Begrüßung, erste fixe Kernfrage, die Abschlussphase in der letzten Minute und die Verabschiedung.",
    "Sprich nie eine Begrüßung oder Verabschiedung selbst aus.",
    "Wenn das Interview in die Abschlussphase geht, stellst du keine zusätzliche Abschlussfrage und keine Zusammenfassung aus eigener Initiative.",
    "Wenn die erste Kernfrage bereits vom Host gestellt wurde, wartest du auf die Kandidatenantwort und wiederholst diese erste Frage nicht.",

    "",
    "Fragenlogik:",
    "Nutze die Kernfragen bevorzugt in der vorgegebenen Reihenfolge. Stelle jede Kernfrage höchstens einmal.",
    "Nach jeder Kandidatenantwort entscheidest du zwischen genau zwei Optionen: eine kurze Rückfrage oder die nächste offene Kernfrage.",
    "Stelle maximal eine Rückfrage pro Kernfrage, außer die Antwort ist komplett ausweichend oder unverständlich.",
    "Wenn der Kandidat unklar, generisch oder zu kurz bleibt, frage gezielt nach einem konkreten Beispiel, einer technischen Entscheidung, einem Trade-off oder einem Ergebnis.",
    "Wenn die Antwort brauchbar und konkret ist, gehe ohne Umwege zur nächsten Kernfrage weiter.",
    "Unterbrich den Kandidaten nicht absichtlich. Bei kurzen Pausen wartest du kurz, statt sofort zu sprechen.",

    "",
    `Rollenspezifischer Interviewfokus: ${roleGuidance}`,
    regionalGuidance,

    "",
    "Vorgesehene Kernfragen für dieses Interview:",
    serializedPlan,
  ].join("\n")
}

// ----------------------------
// Public API
// ----------------------------

type CreateLiveInterviewTokenArgs = {
  apiKey: string
  role: string
  language?: string
}

/**
 * Erstellt ein kurzlebiges Gemini Live-Auth-Token für genau eine neue Session.
 *
 * Dieses Token wird an den Client zurückgegeben, damit der Browser direkt
 * eine Live-Audio-Session öffnen kann, ohne den echten Server-API-Key zu kennen.
 */
export async function createLiveInterviewToken({
                                                 apiKey,
                                                 role,
                                                 language = "de",
                                               }: CreateLiveInterviewTokenArgs) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: "v1alpha",
    },
  })

  const newSessionExpireTime = new Date(Date.now() + LIVE_SESSION_TTL_MS).toISOString()

  const token = await ai.authTokens.create({
    config: {
      /**
       * Token darf genau einmal verwendet werden.
       * Gut für Sicherheit, weil ein abgefangenes Token nicht mehrfach
       * für neue Sessions missbraucht werden kann.
       */
      uses: 1,

      /**
       * Maximale Lebensdauer der neu erstellten Session.
       */
      newSessionExpireTime,

      /**
       * Constraints für die Live-Session, die mit diesem Token geöffnet wird.
       */
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

          systemInstruction: createSystemInstruction(role, language),
        },
      },

      /**
       * Aktuell leer:
       * Der Client darf zusätzliche Felder setzen.
       *
       * Später kann man hier härter einschränken, wenn der Client
       * wirklich nichts mehr überschreiben soll.
       */
      lockAdditionalFields: [],
    },
  })

  if (!token.name) {
    throw new Error("Gemini auth token creation returned no token")
  }

  return {
    token: token.name,
    model: LIVE_MODEL,
    voiceName: LIVE_VOICE,
  }
}
