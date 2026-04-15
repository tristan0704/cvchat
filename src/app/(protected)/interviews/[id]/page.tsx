"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import CodingChallengeEditor from "@/components/coding-challenge/coding-challenge-editor";
import CodingChallengeFeedback from "@/components/coding-challenge/coding-challenge-feedback";
import CvFeedbackStep from "@/components/cv/CvFeedbackStep";
import InterviewFeedback from "@/components/interviews/InterviewFeedback";
import InterviewVoiceStep from "@/components/interviews/InterviewVoiceStep";
import { InterviewSessionProvider } from "@/lib/interview-session/context";

type InterviewDetail = {
    id: string;
    title: string;
    role: string;
    experience: string;
    companySize: string;
    interviewType: string;
    currentStep: number;
    plannedQuestions: Array<{
        id: string;
        sequence: number;
        questionKey: string | null;
        text: string;
        priority: number | null;
    }>;
    cvFeedback: {
        quality: {
            overallScore: number;
        };
        roleAnalysis: {
            summary: string;
        };
    } | null;
    feedback: {
        overallScore: number;
        summary: string;
        strengths: string[];
        issues: string[];
        improvements: string[];
    } | null;
    overallFeedback: {
        analyzedAt: string;
        overallScore: number;
        summary: string;
        strengths: string[];
        issues: string[];
        improvements: string[];
        cvScore: number | null;
        interviewScore: number | null;
        codingChallengeScore: number | null;
    } | null;
    codingChallenge: {
        evaluation: {
            overallScore: number;
            summary: string;
        } | null;
    } | null;
};

function SummaryCard({
    label,
    score,
    summary,
}: {
    label: string;
    score: number | null;
    summary: string;
}) {
    const resolvedScore = score ?? 0;
    const badgeColor =
        resolvedScore >= 75
            ? "bg-green-500/20 text-green-300"
            : resolvedScore >= 50
              ? "bg-yellow-500/20 text-yellow-300"
              : "bg-gray-500/20 text-gray-300";
    const ratingLabel =
        score === null
            ? "Offen"
            : resolvedScore >= 75
              ? "Gut"
              : resolvedScore >= 50
                ? "Mittel"
                : "Schwach";

    return (
        <div className="rounded-lg bg-gray-900 p-4 outline outline-1 outline-white/10">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{label}</p>

                <span className={`rounded-md px-2 py-0.5 text-xs ${badgeColor}`}>
                    {ratingLabel}
                </span>
            </div>

            <p className="mt-2 text-lg font-semibold text-white">
                {score === null ? "--" : `${resolvedScore}%`}
            </p>

            <p className="mt-2 text-xs text-gray-300">{summary}</p>
        </div>
    );
}

function OverallFeedbackBlock({
    interview,
    onOverallFeedbackChange,
}: {
    interview: InterviewDetail;
    onOverallFeedbackChange: (
        overallFeedback: InterviewDetail["overallFeedback"]
    ) => void;
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState("");
    const canGenerateOverallFeedback =
        Boolean(interview.cvFeedback) &&
        Boolean(interview.feedback) &&
        Boolean(interview.codingChallenge?.evaluation);

    useEffect(() => {
        if (!canGenerateOverallFeedback || interview.overallFeedback || isGenerating) {
            return;
        }

        let cancelled = false;

        async function generateOverallFeedback() {
            setIsGenerating(true);
            setGenerationError("");

            try {
                const response = await fetch("/api/interview/overall-feedback", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        interviewId: interview.id,
                    }),
                });
                const data = (await response.json().catch(() => null)) as
                    | {
                          overallFeedback?: InterviewDetail["overallFeedback"];
                          error?: string;
                      }
                    | null;

                if (!response.ok || !data?.overallFeedback) {
                    throw new Error(
                        data?.error ||
                            "Gesamtfeedback konnte nicht erstellt werden."
                    );
                }

                if (!cancelled) {
                    onOverallFeedbackChange(data.overallFeedback);
                }
            } catch (error) {
                if (!cancelled) {
                    setGenerationError(
                        error instanceof Error
                            ? error.message
                            : "Gesamtfeedback konnte nicht erstellt werden."
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsGenerating(false);
                }
            }
        }

        void generateOverallFeedback();

        return () => {
            cancelled = true;
        };
    }, [
        canGenerateOverallFeedback,
        interview.id,
        interview.overallFeedback,
        isGenerating,
        onOverallFeedbackChange,
    ]);

    const cards = [
        {
            label: "CV",
            score:
                interview.overallFeedback?.cvScore ??
                interview.cvFeedback?.quality.overallScore ??
                null,
            summary:
                interview.cvFeedback?.roleAnalysis.summary ||
                "Noch kein CV-Feedback gespeichert.",
        },
        {
            label: "Interview",
            score:
                interview.overallFeedback?.interviewScore ??
                interview.feedback?.overallScore ??
                null,
            summary:
                interview.feedback?.summary ||
                "Noch kein Interview-Feedback gespeichert.",
        },
        {
            label: "Code",
            score:
                interview.overallFeedback?.codingChallengeScore ??
                interview.codingChallenge?.evaluation?.overallScore ??
                null,
            summary:
                interview.codingChallenge?.evaluation?.summary ||
                "Noch kein Coding-Feedback gespeichert.",
        },
    ];

    return (
        <div>
            <h2 className="text-lg font-semibold">Gesamtbewertung</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
                {cards.map((item) => (
                    <SummaryCard
                        key={item.label}
                        label={item.label}
                        score={item.score}
                        summary={item.summary}
                    />
                ))}
            </div>

            {isGenerating ? (
                <div className="mt-4 rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
                    Gesamtfeedback wird aus den gespeicherten Step-Ergebnissen erstellt.
                </div>
            ) : generationError ? (
                <div className="mt-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-200">
                    {generationError}
                </div>
            ) : interview.overallFeedback ? (
                <div className="mt-4 space-y-4">
                    <div className="rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
                        <div className="flex items-center justify-between gap-4">
                            <p>{interview.overallFeedback.summary}</p>
                            <span className="rounded-md bg-indigo-500/20 px-2 py-1 text-xs text-indigo-200">
                                {interview.overallFeedback.overallScore}%
                            </span>
                        </div>
                    </div>

                    <div className="rounded-lg bg-green-500/10 p-4">
                        <p className="mb-2 text-sm font-medium text-green-300">
                            Positiv
                        </p>
                        <ul className="space-y-1 text-sm text-green-200">
                            {interview.overallFeedback.strengths.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-lg bg-red-500/10 p-4">
                        <p className="mb-2 text-sm font-medium text-red-300">
                            Verbesserung
                        </p>
                        <ul className="space-y-1 text-sm text-red-200">
                            {[
                                ...interview.overallFeedback.issues,
                                ...interview.overallFeedback.improvements,
                            ].map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="mt-4 rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
                    Schließe zuerst CV, Interview und Coding-Challenge ab, damit
                    hier eine Gesamtbewertung erscheint.
                </div>
            )}
        </div>
    );
}

function InterviewDetailPageContent() {
    const params = useParams<{ id: string }>();
    const interviewId = params.id;
    const router = useRouter();
    const [interview, setInterview] = useState<InterviewDetail | null>(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function hydrateInterview() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(`/api/interviews/${interviewId}`, {
                    method: "GET",
                    cache: "no-store",
                });
                const data = (await response.json().catch(() => null)) as
                    | { interview?: InterviewDetail; error?: string }
                    | null;

                if (!response.ok || !data?.interview) {
                    throw new Error(
                        data?.error || "Interview konnte nicht geladen werden."
                    );
                }

                if (!cancelled) {
                    setInterview(data.interview);
                    setStep(data.interview.currentStep || 1);
                }
            } catch (interviewError) {
                if (!cancelled) {
                    setError(
                        interviewError instanceof Error
                            ? interviewError.message
                            : "Interview konnte nicht geladen werden."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void hydrateInterview();

        return () => {
            cancelled = true;
        };
    }, [interviewId]);

    const config = useMemo(
        () =>
            interview
                ? {
                      role: interview.role,
                      experience: interview.experience,
                      companySize: interview.companySize,
                      interviewType: interview.interviewType,
                  }
                : {
                      role: "Backend Developer",
                      experience: "",
                      companySize: "",
                      interviewType: "",
                  },
        [interview]
    );

    async function persistStep(nextStep: number) {
        setStep(nextStep);

        try {
            await fetch(`/api/interviews/${interviewId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentStep: nextStep,
                }),
            });

            const refreshedResponse = await fetch(`/api/interviews/${interviewId}`, {
                method: "GET",
                cache: "no-store",
            });
            const refreshedData = (await refreshedResponse
                .json()
                .catch(() => null)) as { interview?: InterviewDetail } | null;

            if (refreshedData?.interview) {
                setInterview(refreshedData.interview);
            } else {
                setInterview((currentInterview) =>
                    currentInterview
                        ? {
                              ...currentInterview,
                              currentStep: nextStep,
                          }
                        : currentInterview
                );
            }
        } catch {
            // Optimistic UI is sufficient here; detail data is reloaded on revisit.
        }
    }

    if (loading) {
        return <div className="min-h-screen bg-gray-900 text-white" />;
    }

    if (!interview) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <main className="mx-auto max-w-7xl px-4 py-10">
                    <div className="rounded-xl bg-gray-800/50 p-6 text-sm text-red-300 outline outline-1 outline-white/10">
                        {error || "Interview konnte nicht geladen werden."}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <InterviewSessionProvider
            interviewId={interview.id}
            config={config}
            plannedQuestions={interview.plannedQuestions}
        >
            <div className="min-h-screen bg-gray-900 text-white">
                <main className="mx-auto max-w-7xl px-4 py-10">
                    <h1 className="text-3xl font-bold">{interview.title}</h1>
                    <p className="mt-2 text-gray-400">Schritt {step} von 6</p>

                    {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

                    <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                        {step === 1 ? (
                            <CvFeedbackStep />
                        ) : step === 2 ? (
                            <InterviewVoiceStep />
                        ) : step === 3 ? (
                            <InterviewFeedback />
                        ) : step === 4 ? (
                            <CodingChallengeEditor />
                        ) : step === 5 ? (
                            <CodingChallengeFeedback />
                        ) : (
                            <OverallFeedbackBlock
                                interview={interview}
                                onOverallFeedbackChange={(overallFeedback) => {
                                    setInterview((currentInterview) =>
                                        currentInterview
                                            ? {
                                                  ...currentInterview,
                                                  overallFeedback,
                                              }
                                            : currentInterview
                                    );
                                }}
                            />
                        )}

                        <div className="mt-6 flex justify-between">
                            <button
                                onClick={() => void persistStep(step - 1)}
                                disabled={step === 1}
                                className="text-sm text-gray-400 disabled:opacity-30"
                            >
                                Zurueck
                            </button>

                            {step < 6 ? (
                                <button
                                    onClick={() => void persistStep(step + 1)}
                                    className="rounded-md bg-indigo-500 px-4 py-2"
                                >
                                    Weiter
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        className="rounded-md bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
                                        onClick={() => router.push("/interviews/new")}
                                    >
                                        Neu starten
                                    </button>
                                    <button
                                        onClick={() => router.push("/interviews")}
                                        className="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400"
                                    >
                                        Abschliessen
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </InterviewSessionProvider>
    );
}

export default function InterviewDetailPage() {
    return (
        <Suspense
            fallback={<div className="min-h-screen bg-gray-900 text-white" />}
        >
            <InterviewDetailPageContent />
        </Suspense>
    );
}
