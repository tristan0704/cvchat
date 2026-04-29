"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import CodingChallengeEditor from "@/components/coding-challenge/coding-challenge-editor";
import CodingChallengeFeedback from "@/components/coding-challenge/coding-challenge-feedback";
import CvFeedbackStep from "@/components/cv/CvFeedbackStep";
import InterviewFeedback from "@/components/interviews/InterviewFeedback";
import InterviewVoiceStep from "@/components/interviews/InterviewVoiceStep";
import { InterviewSessionProvider, useOptionalInterviewSession } from "@/lib/interview-session/context";

type InterviewDetail = {
    id: string;
    title: string;
    role: string;
    experience: string;
    companySize: string;
    currentStep: number;
    cv: {
        id: string;
        fileName: string;
        fileSizeBytes: number | null;
        uploadedAt: string;
    } | null;
    plannedQuestions: Array<{
        id: string;
        sequence: number;
        questionKey: string | null;
        text: string;
        priority: number | null;
    }>;
    transcript: {
        transcriptStatus: "idle" | "recording" | "transcribing" | "ready" | "error";
    } | null;
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

async function fetchInterviewDetail(interviewId: string) {
    const response = await fetch(`/api/interviews/${interviewId}`, {
        method: "GET",
        cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
        | { interview?: InterviewDetail; error?: string }
        | null;

    if (!response.ok || !data?.interview) {
        throw new Error(data?.error || "Interview konnte nicht geladen werden.");
    }

    return data.interview;
}

function getMaxAccessibleStep(args: {
    interview: InterviewDetail;
    hasTranscriptProgress: boolean;
    hasInterviewFeedback: boolean;
}) {
    const { interview, hasTranscriptProgress, hasInterviewFeedback } = args;

    if (interview.codingChallenge?.evaluation) {
        return 6;
    }

    if (hasInterviewFeedback) {
        return 4;
    }

    if (hasTranscriptProgress) {
        return 3;
    }

    if (interview.cvFeedback) {
        return 2;
    }

    return 1;
}

function resolveVoiceNavigationLock(args: {
    callLifecyclePhase:
        | "idle"
        | "opening"
        | "interviewing"
        | "closing"
        | "stopping";
    localTranscriptStatus: "idle" | "recording" | "transcribing" | "ready" | "error";
    persistedTranscriptStatus:
        | "idle"
        | "recording"
        | "transcribing"
        | "ready"
        | "error";
}) {
    if (args.callLifecyclePhase === "opening") {
        return "Der Step-Wechsel bleibt gesperrt, waehrend die Voice-Session aufgebaut wird.";
    }

    if (
        args.callLifecyclePhase === "interviewing" ||
        args.callLifecyclePhase === "closing" ||
        args.callLifecyclePhase === "stopping"
    ) {
        return "Der Step-Wechsel bleibt gesperrt, solange der Call noch laeuft oder beendet wird.";
    }

    if (
        args.localTranscriptStatus === "recording" ||
        args.localTranscriptStatus === "transcribing" ||
        args.persistedTranscriptStatus === "recording" ||
        args.persistedTranscriptStatus === "transcribing"
    ) {
        return "Der Step-Wechsel bleibt gesperrt, waehrend das Transkript verarbeitet wird.";
    }

    return null;
}

function getNextStepRequirement(args: {
    step: number;
    interview: InterviewDetail;
    hasTranscriptProgress: boolean;
    hasInterviewFeedback: boolean;
}) {
    const { step, interview, hasTranscriptProgress, hasInterviewFeedback } = args;

    if (step === 1) {
        return interview.cvFeedback
            ? null
            : "Schritt 1 braucht zuerst ein gespeichertes CV-Feedback.";
    }

    if (step === 2) {
        return hasTranscriptProgress
            ? null
            : "Schritt 2 braucht zuerst einen beendeten Call mit gestarteter Transkriptverarbeitung.";
    }

    if (step === 3) {
        return hasInterviewFeedback
            ? null
            : "Schritt 3 braucht zuerst ein fertiges Interview-Feedback.";
    }

    if (step === 4) {
        return interview.codingChallenge?.evaluation
            ? null
            : "Schritt 4 braucht zuerst eine abgegebene und bewertete Coding-Challenge.";
    }

    return null;
}

function InterviewDetailStepContent({
    interview,
    step,
    error,
    router,
    persistStep,
    setInterview,
    onRefreshInterview,
    onFeedbackNavigationLockChange,
    isPersistingStep,
    feedbackNavigationLock,
}: {
    interview: InterviewDetail;
    step: number;
    error: string;
    router: ReturnType<typeof useRouter>;
    persistStep: (nextStep: number) => Promise<void>;
    setInterview: React.Dispatch<React.SetStateAction<InterviewDetail | null>>;
    onRefreshInterview: () => Promise<void>;
    onFeedbackNavigationLockChange: (message: string | null) => void;
    isPersistingStep: boolean;
    feedbackNavigationLock: string | null;
}) {
    const session = useOptionalInterviewSession();
    const persistedTranscriptStatus = interview.transcript?.transcriptStatus ?? "idle";
    const localTranscriptStatus =
        session?.voiceInterview.postCallTranscriptStatus ?? "idle";
    const hasTranscriptProgress = persistedTranscriptStatus !== "idle";
    const hasInterviewFeedback = Boolean(interview.feedback);
    const maxAccessibleStep = getMaxAccessibleStep({
        interview,
        hasTranscriptProgress,
        hasInterviewFeedback,
    });
    const nextStepRequirement = getNextStepRequirement({
        step,
        interview,
        hasTranscriptProgress,
        hasInterviewFeedback,
    });
    const canAdvance =
        step < 6 && step + 1 <= maxAccessibleStep && nextStepRequirement === null;
    const voiceNavigationLock =
        step === 2
            ? resolveVoiceNavigationLock({
                  callLifecyclePhase:
                      session?.voiceInterview.callLifecyclePhase ?? "idle",
                  localTranscriptStatus,
                  persistedTranscriptStatus,
              })
            : null;
    const navigationLockMessage = voiceNavigationLock ?? feedbackNavigationLock;
    const canNavigateBack = step > 1 && !isPersistingStep && !navigationLockMessage;
    const canNavigateForward =
        canAdvance && !isPersistingStep && !navigationLockMessage;

    useEffect(() => {
        if (step !== 2) {
            return;
        }

        if (
            localTranscriptStatus !== "transcribing" &&
            localTranscriptStatus !== "ready" &&
            localTranscriptStatus !== "error"
        ) {
            return;
        }

        void onRefreshInterview();
    }, [localTranscriptStatus, onRefreshInterview, step]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">{interview.title}</h1>
                <p className="mt-2 text-gray-400">Schritt {step} von 6</p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {[
                        "CV",
                        "Voice",
                        "Interview",
                        "Code",
                        "Code Review",
                        "Gesamt",
                    ].map((label, index) => {
                        const stepNumber = index + 1;
                        const isActive = stepNumber === step;
                        const isUnlocked = stepNumber <= maxAccessibleStep;

                        return (
                            <span
                                key={label}
                                className={`rounded-full px-3 py-1 text-xs ${
                                    isActive
                                        ? "bg-indigo-500 text-white"
                                        : isUnlocked
                                          ? "bg-white/10 text-gray-200"
                                          : "bg-white/5 text-gray-500"
                                }`}
                            >
                                {stepNumber}. {label}
                            </span>
                        );
                    })}
                </div>

                {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

                <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                    {step === 1 ? (
                        <CvFeedbackStep />
                    ) : step === 2 ? (
                        <InterviewVoiceStep />
                    ) : step === 3 ? (
                        <InterviewFeedback
                            onEvaluationReady={() => void onRefreshInterview()}
                            onNavigationStateChange={onFeedbackNavigationLockChange}
                        />
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
                            disabled={!canNavigateBack}
                            className="text-sm text-gray-400 disabled:opacity-30"
                        >
                            Zurück
                        </button>

                        {step < 6 ? (
                            <div className="text-right">
                                {navigationLockMessage ? (
                                    <p className="mb-2 text-xs text-amber-300">
                                        {navigationLockMessage}
                                    </p>
                                ) : nextStepRequirement ? (
                                    <p className="mb-2 text-xs text-amber-300">
                                        {nextStepRequirement}
                                    </p>
                                ) : null}

                                <button
                                    onClick={() => void persistStep(step + 1)}
                                    disabled={!canNavigateForward}
                                    className="rounded-md bg-indigo-500 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Weiter
                                </button>
                            </div>
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
    );
}

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
                    Schliesse zuerst CV, Interview und Coding-Challenge ab, damit
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
    const [isPersistingStep, setIsPersistingStep] = useState(false);
    const [feedbackNavigationLock, setFeedbackNavigationLock] = useState<string | null>(
        null
    );

    const refreshInterview = useCallback(
        async (options?: { syncStep?: boolean; showLoading?: boolean }) => {
            const { syncStep = false, showLoading = false } = options ?? {};

            if (showLoading) {
                setLoading(true);
                setError("");
            }

            try {
                const nextInterview = await fetchInterviewDetail(interviewId);
                setInterview(nextInterview);

                if (syncStep) {
                    setStep(nextInterview.currentStep || 1);
                }
            } catch (interviewError) {
                setError(
                    interviewError instanceof Error
                        ? interviewError.message
                        : "Interview konnte nicht geladen werden."
                );
                throw interviewError;
            } finally {
                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [interviewId]
    );

    useEffect(() => {
        let cancelled = false;

        async function hydrateInterview() {
            try {
                await refreshInterview({ syncStep: true, showLoading: true });
            } catch (interviewError) {
                if (!cancelled) {
                    setError(
                        interviewError instanceof Error
                            ? interviewError.message
                            : "Interview konnte nicht geladen werden."
                    );
                }
            }
        }

        void hydrateInterview();

        return () => {
            cancelled = true;
        };
    }, [interviewId, refreshInterview]);

    useEffect(() => {
        let cancelled = false;

        const intervalId = window.setInterval(() => {
            void (async () => {
                try {
                    const refreshedInterview = await fetchInterviewDetail(interviewId);

                    if (!cancelled) {
                        setInterview(refreshedInterview);
                    }
                } catch {
                    // Silent refresh keeps step gating aligned with persisted data.
                }
            })();
        }, 4_000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [interviewId]);

    const config = useMemo(
        () =>
            interview
                ? {
                      role: interview.role,
                      experience: interview.experience,
                      companySize: interview.companySize,
                  }
                : {
                      role: "Backend Developer",
                      experience: "",
                      companySize: "",
                  },
        [interview]
    );

    async function persistStep(nextStep: number) {
        const boundedStep = Math.max(1, Math.min(6, nextStep));
        setIsPersistingStep(true);

        try {
            const response = await fetch(`/api/interviews/${interviewId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentStep: boundedStep,
                }),
            });

            if (!response.ok) {
                throw new Error("Interview-Schritt konnte nicht gespeichert werden.");
            }

            const refreshedInterview = await fetchInterviewDetail(interviewId);
            setInterview(refreshedInterview);
            setStep(refreshedInterview.currentStep || boundedStep);
        } catch (persistError) {
            setError(
                persistError instanceof Error
                    ? persistError.message
                    : "Interview-Schritt konnte nicht gespeichert werden."
            );
        } finally {
            setIsPersistingStep(false);
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
            <InterviewDetailStepContent
                interview={interview}
                step={step}
                error={error}
                router={router}
                persistStep={persistStep}
                setInterview={setInterview}
                onRefreshInterview={() => refreshInterview()}
                onFeedbackNavigationLockChange={setFeedbackNavigationLock}
                isPersistingStep={isPersistingStep}
                feedbackNavigationLock={feedbackNavigationLock}
            />
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
