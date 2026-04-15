import "server-only";

import { db } from "@/db-backend/prisma/client";
import { callOpenAiChat } from "@/lib/openai";
import type { InterviewOverallFeedback } from "@/lib/interview-overall-feedback/types";

type AggregatedFeedbackSource = {
    cvScore: number | null;
    cvSummary: string | null;
    interviewScore: number | null;
    interviewSummary: string | null;
    codingChallengeScore: number | null;
    codingChallengeSummary: string | null;
};

type OverallFeedbackLlmPayload = {
    summary?: unknown;
    strengths?: unknown;
    issues?: unknown;
    improvements?: unknown;
};

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeStringList(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
        .slice(0, 4);
}

function buildFallbackOverallFeedback(
    source: AggregatedFeedbackSource
): InterviewOverallFeedback {
    const availableScores = [
        source.cvScore,
        source.interviewScore,
        source.codingChallengeScore,
    ].filter((score): score is number => Number.isFinite(score));
    const overallScore = availableScores.length
        ? clampScore(
              availableScores.reduce((sum, score) => sum + score, 0) /
                  availableScores.length
          )
        : 0;

    const strengths = [
        source.cvScore !== null && source.cvScore >= 70
            ? "Der Lebenslauf passt bereits solide zur Zielrolle."
            : null,
        source.interviewScore !== null && source.interviewScore >= 70
            ? "Die fachliche und kommunikative Interview-Leistung ist tragfähig."
            : null,
        source.codingChallengeScore !== null && source.codingChallengeScore >= 70
            ? "Die Coding-Challenge zeigt eine belastbare praktische Umsetzung."
            : null,
    ].filter((item): item is string => Boolean(item));
    const issues = [
        source.cvScore !== null && source.cvScore < 60
            ? "Der CV transportiert Rolle, Wirkung oder Schwerpunkte noch nicht klar genug."
            : null,
        source.interviewScore !== null && source.interviewScore < 60
            ? "Im Interview fehlen noch Präzision, Struktur oder klare Beispiele."
            : null,
        source.codingChallengeScore !== null && source.codingChallengeScore < 60
            ? "In der Coding-Challenge fehlt noch Robustheit oder saubere Problemlösung."
            : null,
    ].filter((item): item is string => Boolean(item));
    const improvements = [
        "Die schwächste Teilbewertung sollte gezielt vor dem nächsten Interview überarbeitet werden.",
        "Antworten, CV-Story und Coding-Vorgehen sollten dieselbe Zielrolle konsistent unterstützen.",
    ];

    const summaryParts = [
        source.cvSummary,
        source.interviewSummary,
        source.codingChallengeSummary,
    ].filter((item): item is string => Boolean(item && item.trim()));

    return {
        analyzedAt: new Date().toISOString(),
        overallScore,
        summary:
            summaryParts[0] ??
            "Es liegen noch nicht genug Step-Ergebnisse für eine belastbare Gesamtbewertung vor.",
        strengths,
        issues,
        improvements,
        cvScore: source.cvScore,
        interviewScore: source.interviewScore,
        codingChallengeScore: source.codingChallengeScore,
    };
}

function buildUserPrompt(role: string, source: AggregatedFeedbackSource) {
    return JSON.stringify(
        {
            role,
            cv: {
                score: source.cvScore,
                summary: source.cvSummary,
            },
            interview: {
                score: source.interviewScore,
                summary: source.interviewSummary,
            },
            codingChallenge: {
                score: source.codingChallengeScore,
                summary: source.codingChallengeSummary,
            },
        },
        null,
        2
    );
}

function parseOverallFeedbackPayload(
    content: string,
    fallback: InterviewOverallFeedback
) {
    try {
        const parsed = JSON.parse(content) as OverallFeedbackLlmPayload;
        const summary =
            typeof parsed.summary === "string" && parsed.summary.trim()
                ? parsed.summary.trim()
                : fallback.summary;

        return {
            ...fallback,
            summary,
            strengths: normalizeStringList(parsed.strengths),
            issues: normalizeStringList(parsed.issues),
            improvements: normalizeStringList(parsed.improvements),
        } satisfies InterviewOverallFeedback;
    } catch {
        return fallback;
    }
}

export async function createOrRefreshInterviewOverallFeedback(args: {
    userId: string;
    interviewId: string;
    force?: boolean;
}) {
    const interview = await db.interview.findFirst({
        where: {
            id: args.interviewId,
            userId: args.userId,
        },
        include: {
            cvFeedbackAnalysis: true,
            feedback: true,
            overallFeedback: true,
            codingChallengeAttempts: {
                orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
                include: {
                    evaluation: true,
                },
                take: 1,
            },
        },
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    if (interview.overallFeedback && !args.force) {
        return interview.overallFeedback;
    }

    const latestAttempt = interview.codingChallengeAttempts[0] ?? null;
    const source = {
        cvScore: interview.cvFeedbackAnalysis?.overallScore ?? null,
        cvSummary: interview.cvFeedbackAnalysis?.roleSummary ?? null,
        interviewScore: interview.feedback?.overallScore ?? null,
        interviewSummary: interview.feedback?.summary ?? null,
        codingChallengeScore: latestAttempt?.evaluation?.overallScore ?? null,
        codingChallengeSummary: latestAttempt?.evaluation?.summary ?? null,
    } satisfies AggregatedFeedbackSource;

    if (
        source.cvScore === null ||
        source.interviewScore === null ||
        source.codingChallengeScore === null
    ) {
        throw new Error("Interview is not ready for overall feedback");
    }

    const fallback = buildFallbackOverallFeedback(source);
    const llmResult = await callOpenAiChat({
        model: "gpt-4o-mini",
        temperature: 0.2,
        prompt:
            "Du bist ein erfahrener Karriere-Coach. Erstelle aus den gelieferten Step-Ergebnissen eine knappe Gesamtbewertung auf Deutsch. Antworte ausschliesslich als JSON mit den Feldern summary (string), strengths (string[]), issues (string[]), improvements (string[]). Die Summary soll 2-4 Saetze enthalten und die Scores beruecksichtigen, ohne neue Fakten zu erfinden.",
        question: buildUserPrompt(interview.role, source),
        timeoutMs: 20_000,
    });

    const resolvedFeedback = llmResult.ok
        ? parseOverallFeedbackPayload(llmResult.content, fallback)
        : fallback;

    return db.interviewOverallFeedback.upsert({
        where: {
            interviewId: interview.id,
        },
        update: {
            analyzedAt: new Date(resolvedFeedback.analyzedAt),
            overallScore: resolvedFeedback.overallScore,
            summary: resolvedFeedback.summary,
            strengths: resolvedFeedback.strengths,
            issues: resolvedFeedback.issues,
            improvements: resolvedFeedback.improvements,
            cvScore: resolvedFeedback.cvScore,
            interviewScore: resolvedFeedback.interviewScore,
            codingChallengeScore: resolvedFeedback.codingChallengeScore,
        },
        create: {
            interviewId: interview.id,
            analyzedAt: new Date(resolvedFeedback.analyzedAt),
            overallScore: resolvedFeedback.overallScore,
            summary: resolvedFeedback.summary,
            strengths: resolvedFeedback.strengths,
            issues: resolvedFeedback.issues,
            improvements: resolvedFeedback.improvements,
            cvScore: resolvedFeedback.cvScore,
            interviewScore: resolvedFeedback.interviewScore,
            codingChallengeScore: resolvedFeedback.codingChallengeScore,
        },
    });
}
