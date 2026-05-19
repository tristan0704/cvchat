"use client";

import { useEffect, useRef, useState } from "react";

import { CvFeedbackReport } from "@/components/cv/feedback/CvFeedbackReport";
import {
    CvFeedbackStateCard,
    CvReportLoadingCard,
} from "@/components/cv/feedback/CvFeedbackStateCard";
import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";
import { useI18n } from "@/lib/i18n/context";
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

type RuntimeStatusSnapshot = {
    id: string;
    currentStep: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    transcriptStatus: "idle" | "recording" | "transcribing" | "ready" | "error" | null;
    transcriptError: string;
    hasCvFeedback: boolean;
    hasInterviewFeedback: boolean;
    hasOverallFeedback: boolean;
    hasCodingEvaluation: boolean;
    statusVersion: number;
    lastActivityAt: string;
};

function buildConfigBadges(config: InterviewCvConfig) {
    return [config.role, config.experience, config.companySize].filter(
        (value) => value.trim().length > 0
    );
}

function formatDateTime(value: string, language: string) {
    return new Intl.DateTimeFormat(language === "en" ? "en-US" : "de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

async function requestCvFeedback(
    interviewId: string,
    fallbackLoadError: string,
    fallbackCreateError: string,
    force = false
) {
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
              status?: RuntimeStatusSnapshot | null;
              error?: string;
          }
        | null;

    if (!response.ok || !data) {
        throw new Error(data?.error || fallbackLoadError);
    }

    if (!data?.result && force) {
        throw new Error(data?.error || fallbackCreateError);
    }

    return data;
}

async function generateCvFeedback(interviewId: string, fallbackCreateError: string) {
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
              status?: RuntimeStatusSnapshot | null;
              error?: string;
          }
        | null;

    if (!response.ok || !data?.result) {
        throw new Error(data?.error || fallbackCreateError);
    }

    return data;
}

export default function CvFeedbackStep({
    onStatusUpdate,
}: {
    onStatusUpdate?: (status: RuntimeStatusSnapshot) => void;
}) {
    const session = useInterviewSession();
    const { dictionary, language } = useI18n();
    const labels = dictionary.cvFeedback;
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
                    requestCvFeedback(
                        session.interviewId,
                        labels.loadError,
                        labels.createError
                    );
                hydratePromiseRef.current = requestPromise;
                const data = await requestPromise;

                if (cancelled) {
                    return;
                }

                setStoredCv(data.cv ?? null);
                setResult(data.result ?? null);
                if (data.status) {
                    onStatusUpdate?.(data.status);
                }
            } catch (storageError) {
                if (!cancelled) {
                    setError(getErrorMessage(storageError, labels.loadError));
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
    }, [labels.createError, labels.loadError, onStatusUpdate, session.interviewId]);

    async function handleRefreshFeedback() {
        setLoading(true);
        setError("");

        try {
            const requestPromise =
                generatePromiseRef.current ??
                generateCvFeedback(session.interviewId, labels.createError);
            generatePromiseRef.current = requestPromise;
            const data = await requestPromise;
            setStoredCv(data.cv ?? null);
            setResult(data.result ?? null);
            if (data.status) {
                onStatusUpdate?.(data.status);
            }
        } catch (requestError) {
            setError(getErrorMessage(requestError, labels.createError));
        } finally {
            setLoading(false);
            generatePromiseRef.current = null;
        }
    }

    const badges = buildConfigBadges(config);

    return (
        <div className="space-y-6">
            <CvFeedbackStateCard
                labels={labels}
                badges={badges}
                storedCv={storedCv}
                analyzedAt={result?.analyzedAt}
                loadingStoredCv={loadingStoredCv}
                loading={loading}
                error={error}
                formatDateTime={(value) => formatDateTime(value, language)}
                onGenerate={() => void handleRefreshFeedback()}
            />

            {loading ? (
                <CvReportLoadingCard>{labels.analyzingResume}</CvReportLoadingCard>
            ) : null}

            {!loading && result ? (
                <CvFeedbackReport
                    result={result}
                    config={config}
                    labels={labels}
                    commonLabels={dictionary.common}
                />
            ) : null}

            {!loading && !result ? (
                <CvReportLoadingCard>{labels.emptyReportHint}</CvReportLoadingCard>
            ) : null}
        </div>
    );
}
