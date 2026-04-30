"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import CvAnalysisDashboard from "@/components/cv/CvAnalysisDashboard";
import CvRoleMatchCard from "@/components/cv/CvRoleMatchCard";
import CvScoreBreakdownCard from "@/components/cv/CvScoreBreakdownCard";
import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";
import { useInterviewSession } from "@/lib/interview-session/context";

// Dateiübersicht:
// Der CV-Step trennt günstiges Laden vorhandener Analyse-Daten von expliziter
// Generierung. Initiale GETs und teure POSTs werden lokal dedupliziert, damit
// React-Remounts oder schnelle Klicks keine doppelte Analyse auslösen.

type ActiveCvSummary = {
    id: string;
    fileName: string;
    fileSizeBytes: number | null;
    mimeType: string | null;
    uploadedAt: string;
};

function buildConfigBadges(config: InterviewCvConfig) {
    return [config.role, config.experience, config.companySize].filter(
        (value) => value.trim().length > 0
    );
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

async function requestCvFeedback(interviewId: string, force = false) {
    const response = await fetch(
        force
            ? "/api/interview/cv-feedback"
            : `/api/interview/cv-feedback?interviewId=${encodeURIComponent(
                  interviewId
              )}`,
        {
            method: force ? "POST" : "GET",
            headers: force
                ? {
                      "Content-Type": "application/json",
                  }
                : undefined,
            body: force
                ? JSON.stringify({
                      interviewId,
                      force,
                  })
                : undefined,
        }
    );

    const data = (await response.json().catch(() => null)) as
        | {
              cv?: ActiveCvSummary;
              result?: CvFeedbackResult | null;
              error?: string;
          }
        | null;

    if (!response.ok || !data) {
        throw new Error(data?.error || "CV-Analyse konnte nicht geladen werden.");
    }

    if (!data?.result && force) {
        throw new Error(data?.error || "CV-Analyse konnte nicht erstellt werden.");
    }

    return data;
}

async function generateCvFeedback(interviewId: string) {
    const response = await fetch("/api/interview/cv-feedback", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            interviewId,
            force: true,
        }),
    });

    const data = (await response.json().catch(() => null)) as
        | {
              cv?: ActiveCvSummary;
              result?: CvFeedbackResult;
              error?: string;
          }
        | null;

    if (!response.ok || !data?.result) {
        throw new Error(data?.error || "CV-Analyse konnte nicht erstellt werden.");
    }

    return data;
}

export default function CvFeedbackStep() {
    const session = useInterviewSession();
    const config = session.config;

    const [storedCv, setStoredCv] = useState<ActiveCvSummary | null>(null);
    const [loadingStoredCv, setLoadingStoredCv] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<CvFeedbackResult | null>(null);
    const hydratePromiseRef = useRef<Promise<
        Awaited<ReturnType<typeof requestCvFeedback>>
    > | null>(null);
    const generatePromiseRef = useRef<Promise<
        Awaited<ReturnType<typeof generateCvFeedback>>
    > | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function hydrateStep() {
            setLoadingStoredCv(true);
            setLoading(false);
            setError("");

            try {
                const requestPromise =
                    hydratePromiseRef.current ??
                    requestCvFeedback(session.interviewId);
                hydratePromiseRef.current = requestPromise;
                const data = await requestPromise;

                if (cancelled) {
                    return;
                }

                setStoredCv(data.cv ?? null);
                setResult(data.result ?? null);
            } catch (storageError) {
                if (!cancelled) {
                    setError(
                        getErrorMessage(
                            storageError,
                            "CV-Analyse konnte nicht geladen werden."
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setLoadingStoredCv(false);
                }
                hydratePromiseRef.current = null;
            }
        }

        void hydrateStep();

        return () => {
            cancelled = true;
        };
    }, [session.interviewId]);

    async function handleRefreshFeedback() {
        setLoading(true);
        setError("");

        try {
            const requestPromise =
                generatePromiseRef.current ??
                generateCvFeedback(session.interviewId);
            generatePromiseRef.current = requestPromise;
            const data = await requestPromise;
            setStoredCv(data.cv ?? null);
            setResult(data.result ?? null);
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError,
                    "CV-Analyse konnte nicht erstellt werden."
                )
            );
        } finally {
            setLoading(false);
            generatePromiseRef.current = null;
        }
    }

    const badges = buildConfigBadges(config);

    return (
        <div className="space-y-6">
            <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">CV-Feedback</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Analyse für die ausgewählte Interview-Konfiguration.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {badges.map((badge) => (
                            <span
                                key={badge}
                                className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-gray-300 outline outline-1 outline-white/10"
                            >
                                {badge}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="mt-6 rounded-xl bg-gray-900 p-4 outline outline-1 outline-white/10">
                    {loadingStoredCv ? (
                        <p className="text-sm text-gray-400">
                            Gespeicherter Lebenslauf wird geladen...
                        </p>
                    ) : storedCv ? (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {storedCv.fileName}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    Im Profil gespeichert am{" "}
                                    {formatDateTime(storedCv.uploadedAt)}
                                </p>
                                {result?.analyzedAt ? (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Letzte Analyse: {formatDateTime(result.analyzedAt)}
                                    </p>
                                ) : null}
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleRefreshFeedback()}
                                disabled={loading}
                                className="rounded-md bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                            >
                                {loading
                                    ? "Analysiere..."
                                    : result
                                      ? "Feedback aktualisieren"
                                      : "Feedback starten"}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    Kein Lebenslauf im Profil hinterlegt
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Lade deinen CV zuerst im Profil hoch. Danach wird
                                    er hier pro Interview-Konfiguration automatisch
                                    analysiert.
                                </p>
                            </div>

                            <Link
                                href="/profile"
                                className="rounded-md bg-white/5 px-4 py-3 text-sm font-semibold text-white outline outline-1 outline-white/10 transition hover:bg-white/10"
                            >
                                Zum Profil
                            </Link>
                        </div>
                    )}
                </div>

                {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
            </div>

            {loading ? (
                <div className="rounded-xl bg-gray-800/50 p-10 text-center text-sm text-gray-400 outline outline-1 outline-white/10">
                    CV wird analysiert...
                </div>
            ) : null}

            {!loading && result ? (
                <div className="space-y-6">
                    <CvScoreBreakdownCard breakdown={result.scoreBreakdown} />
                    <CvAnalysisDashboard data={result.quality} />
                    <CvRoleMatchCard analysis={result.roleAnalysis} />
                </div>
            ) : null}

            {!loading && !result ? (
                <div className="rounded-xl bg-gray-800/50 p-10 text-center text-sm text-gray-400 outline outline-1 outline-white/10">
                    Hinterlege deinen Lebenslauf im Profil, um hier ein
                    rollenbezogenes Feedback zu sehen.
                </div>
            ) : null}
        </div>
    );
}
