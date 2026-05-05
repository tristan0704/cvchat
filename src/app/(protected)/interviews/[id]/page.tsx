"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import CodingChallengeEditor from "@/components/coding-challenge/coding-challenge-editor";
import CodingChallengeFeedback from "@/components/coding-challenge/coding-challenge-feedback";
import CvFeedbackStep from "@/components/cv/CvFeedbackStep";
import InterviewFeedback from "@/components/interviews/InterviewFeedback";
import InterviewVoiceStep from "@/components/interviews/InterviewVoiceStep";
import { readApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n/context";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { InterviewSessionProvider, useOptionalInterviewSession } from "@/lib/interview-session/context";

type InterviewMode = "voice" | "face";

// Dateiübersicht:
// Die Detailseite lädt einmal die vollständige Interview-Shell für Navigation,
// Konfiguration und geplante Fragen. Laufende Aktualisierungen verwenden danach
// nur noch den kleinen Status-Endpunkt, damit Polling keine schweren Datenblöcke
// oder Frage-Texte nachlädt.

type InterviewDetail = {
    id: string;
    title: string;
    role: string;
    experience: string;
    companySize: string;
    interviewMode: InterviewMode | null;
    currentStep: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
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
        transcriptError: string;
    } | null;
    hasCvFeedback: boolean;
    hasInterviewFeedback: boolean;
    hasOverallFeedback: boolean;
    hasCodingEvaluation: boolean;
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

type InterviewStatusSnapshot = {
    id: string;
    currentStep: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    interviewMode?: InterviewMode | null;
    transcriptStatus: "idle" | "recording" | "transcribing" | "ready" | "error" | null;
    transcriptError: string;
    hasCvFeedback: boolean;
    hasInterviewFeedback: boolean;
    hasOverallFeedback: boolean;
    hasCodingEvaluation: boolean;
    statusVersion: number;
    lastActivityAt: string;
};

async function fetchInterviewDetail(interviewId: string, fallbackError: string) {
    const response = await fetch(`/api/interviews/${interviewId}/shell`, {
        method: "GET",
        cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
        | {
              interview?: InterviewDetail;
              status?: InterviewStatusSnapshot;
              error?: unknown;
              errorMessage?: string;
          }
        | null;

    if (!response.ok || !data?.interview) {
        throw new Error(
            readApiErrorMessage(data, fallbackError)
        );
    }

    return data.status
        ? mergeInterviewStatus(data.interview, data.status)
        : data.interview;
}

async function fetchInterviewStatus(interviewId: string, fallbackError: string) {
    const response = await fetch(`/api/interviews/${interviewId}/status`, {
        method: "GET",
        cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
        | { status?: InterviewStatusSnapshot; error?: unknown; errorMessage?: string }
        | null;

    if (!response.ok || !data?.status) {
        throw new Error(
            readApiErrorMessage(
                data,
                fallbackError
            )
        );
    }

    return data.status;
}

function mergeInterviewStatus(
    interview: InterviewDetail,
    status: InterviewStatusSnapshot
) {
    return {
        ...interview,
        currentStep: status.currentStep,
        status: status.status,
        startedAt: status.startedAt,
        completedAt: status.completedAt,
        interviewMode: status.interviewMode ?? interview.interviewMode,
        transcript: status.transcriptStatus
            ? {
                  transcriptStatus: status.transcriptStatus,
                  transcriptError: status.transcriptError,
              }
            : null,
        hasCvFeedback: status.hasCvFeedback,
        hasInterviewFeedback: status.hasInterviewFeedback,
        hasOverallFeedback: status.hasOverallFeedback,
        hasCodingEvaluation: status.hasCodingEvaluation,
    } satisfies InterviewDetail;
}

function getMaxAccessibleStep(args: {
    interview: InterviewDetail;
    hasTranscriptProgress: boolean;
    hasInterviewFeedback: boolean;
}) {
    const { interview, hasTranscriptProgress, hasInterviewFeedback } = args;

    if (interview.hasCodingEvaluation || interview.codingChallenge?.evaluation) {
        return 6;
    }

    if (hasInterviewFeedback) {
        return 4;
    }

    if (hasTranscriptProgress) {
        return 3;
    }

    if (interview.hasCvFeedback || interview.cvFeedback) {
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
    labels: AppDictionary["interviewDetail"];
}) {
    if (args.callLifecyclePhase === "opening") {
        return args.labels.lockOpening;
    }

    if (
        args.callLifecyclePhase === "interviewing" ||
        args.callLifecyclePhase === "closing" ||
        args.callLifecyclePhase === "stopping"
    ) {
        return args.labels.lockRunning;
    }

    if (
        args.localTranscriptStatus === "recording" ||
        args.localTranscriptStatus === "transcribing" ||
        args.persistedTranscriptStatus === "recording" ||
        args.persistedTranscriptStatus === "transcribing"
    ) {
        return args.labels.lockTranscript;
    }

    return null;
}

function getNextStepRequirement(args: {
    step: number;
    interview: InterviewDetail;
    hasTranscriptProgress: boolean;
    hasInterviewFeedback: boolean;
    labels: AppDictionary["interviewDetail"];
}) {
    const { step, interview, hasTranscriptProgress, hasInterviewFeedback, labels } = args;

    if (step === 1) {
        return interview.hasCvFeedback || interview.cvFeedback
            ? null
            : labels.requirementCv;
    }

    if (step === 2) {
        return hasTranscriptProgress
            ? null
            : labels.requirementTranscript;
    }

    if (step === 3) {
        return hasInterviewFeedback
            ? null
            : labels.requirementInterview;
    }

    if (step === 4) {
        return interview.hasCodingEvaluation || interview.codingChallenge?.evaluation
            ? null
            : labels.requirementCoding;
    }

    return null;
}

function CallSetupStep({
    selectedMode,
    onModeChange,
    disabled,
    error,
}: {
    selectedMode: InterviewMode | null;
    onModeChange: (mode: InterviewMode) => void;
    disabled?: boolean;
    error?: string;
}) {
    const { dictionary } = useI18n();
    const labels = dictionary.interviewDetail;
    const interviewModeOptions: Array<{
        id: InterviewMode;
        title: string;
        description: string;
        badge: string;
    }> = [
        {
            id: "voice",
            title: labels.voiceOnly,
            description: labels.voiceOnlyDescription,
            badge: labels.noCamera,
        },
        {
            id: "face",
            title: labels.voiceFace,
            description: labels.voiceFaceDescription,
            badge: labels.fullCall,
        },
    ];

    return (
        <div className="space-y-5">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                    {labels.callSetup}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                    {labels.callSetupTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                    {labels.callSetupDescription}
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {interviewModeOptions.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onModeChange(option.id)}
                        disabled={disabled}
                        className={`rounded-lg p-5 text-left outline outline-1 transition ${
                            selectedMode === option.id
                                ? "bg-indigo-500/15 outline-indigo-400"
                                : "bg-gray-900 outline-white/10 hover:bg-white/5"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        <span className="inline-flex rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 outline outline-1 outline-white/10">
                            {option.badge}
                        </span>
                        <p className="mt-4 text-base font-semibold text-white">
                            {option.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            {option.description}
                        </p>
                    </button>
                ))}
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
    );
}

function InterviewDetailStepContent({
    interview,
    step,
    error,
    router,
    persistStep,
    setInterview,
    onStatusUpdate,
    onRefreshInterview,
    onFeedbackNavigationLockChange,
    isPersistingStep,
    feedbackNavigationLock,
}: {
    interview: InterviewDetail;
    step: number;
    error: string;
    router: ReturnType<typeof useRouter>;
    persistStep: (nextStep: number, extraData?: Record<string, unknown>) => Promise<void>;
    setInterview: React.Dispatch<React.SetStateAction<InterviewDetail | null>>;
    onStatusUpdate: (status: InterviewStatusSnapshot) => void;
    onRefreshInterview: () => Promise<void>;
    onFeedbackNavigationLockChange: (message: string | null) => void;
    isPersistingStep: boolean;
    feedbackNavigationLock: string | null;
}) {
    const { dictionary } = useI18n();
    const labels = dictionary.interviewDetail;
    const [pendingMode, setPendingMode] = useState<InterviewMode | null>(
        interview.interviewMode
    );
    const session = useOptionalInterviewSession();

    const persistedTranscriptStatus = interview.transcript?.transcriptStatus ?? "idle";
    const localTranscriptStatus =
        session?.voiceInterview.postCallTranscriptStatus ?? "idle";
    const hasTranscriptProgress = persistedTranscriptStatus !== "idle";
    const visibleInterviewMode =
        interview.interviewMode ?? (hasTranscriptProgress ? "face" : null);

    const maxAccessibleStep = getMaxAccessibleStep({
        interview,
        hasTranscriptProgress,
        hasInterviewFeedback: interview.hasInterviewFeedback,
    });
    const nextStepRequirement = getNextStepRequirement({
        step,
        interview,
        hasTranscriptProgress,
        hasInterviewFeedback: interview.hasInterviewFeedback,
        labels,
    });

    const voiceNavigationLock =
        step === 2
            ? resolveVoiceNavigationLock({
                  callLifecyclePhase:
                      session?.voiceInterview.callLifecyclePhase ?? "idle",
                  localTranscriptStatus,
                  persistedTranscriptStatus,
                  labels,
              })
            : null;

    const navigationLockMessage = voiceNavigationLock ?? feedbackNavigationLock;
    const canNavigateBack = step > 1 && !isPersistingStep && !navigationLockMessage;
    const isCallSetup = step === 2 && !visibleInterviewMode;
    const canNavigateForward =
        (isCallSetup ? !!pendingMode : canAdvance(step, maxAccessibleStep, nextStepRequirement)) &&
        !isPersistingStep &&
        !navigationLockMessage;

    function canAdvance(s: number, max: number, req: string | null) {
        return s < 6 && s + 1 <= max && req === null;
    }

    useEffect(() => {
        if (step === 2 && ["transcribing", "ready", "error"].includes(localTranscriptStatus)) {
            void onRefreshInterview();
        }
    }, [localTranscriptStatus, onRefreshInterview, step]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">{interview.title}</h1>
                <p className="mt-2 text-gray-400">
                    {labels.step} {step} {labels.of} 6
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {labels.steps.map((label, index) => (
                        <span
                            key={label}
                            className={`rounded-full px-3 py-1 text-xs ${
                                index + 1 === step
                                    ? "bg-indigo-500 text-white"
                                    : index + 1 <= maxAccessibleStep
                                      ? "bg-white/10 text-gray-200"
                                      : "bg-white/5 text-gray-500"
                            }`}
                        >
                            {index + 1}. {label}
                        </span>
                    ))}
                </div>

                {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

                <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                    {step === 1 ? (
                        <CvFeedbackStep onStatusUpdate={onStatusUpdate} />
                    ) : step === 2 ? (
                        visibleInterviewMode ? (
                            <InterviewVoiceStep />
                        ) : (
                            <CallSetupStep
                                selectedMode={pendingMode}
                                onModeChange={setPendingMode}
                                disabled={isPersistingStep}
                            />
                        )
                    ) : step === 3 ? (
                        <InterviewFeedback
                            onEvaluationReady={() => void onRefreshInterview()}
                            onNavigationStateChange={onFeedbackNavigationLockChange}
                        />
                    ) : step === 4 ? (
                        <CodingChallengeEditor onStatusUpdate={onStatusUpdate} />
                    ) : step === 5 ? (
                        <CodingChallengeFeedback />
                    ) : (
                        <OverallFeedbackBlock
                            interview={interview}
                            onOverallFeedbackChange={(overallFeedback) =>
                                setInterview((curr) => curr ? { ...curr, overallFeedback } : curr)
                            }
                            onStatusUpdate={onStatusUpdate}
                        />
                    )}

                    <div className="mt-6 flex justify-between">
                        <button
                            onClick={() => void persistStep(step - 1)}
                            disabled={!canNavigateBack}
                            className="text-sm text-gray-400 disabled:opacity-30"
                        >
                            {labels.back}
                        </button>

                        {step < 6 ? (
                            <div className="text-right">
                                {(navigationLockMessage || nextStepRequirement) && (
                                    <p className="mb-2 text-xs text-amber-300">
                                        {navigationLockMessage || nextStepRequirement}
                                    </p>
                                )}
                                <button
                                    onClick={() =>
                                        isCallSetup
                                            ? pendingMode && persistStep(step, { interviewMode: pendingMode })
                                            : persistStep(step + 1)
                                    }
                                    disabled={!canNavigateForward}
                                    className="rounded-md bg-indigo-500 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {isCallSetup && isPersistingStep ? labels.saving : labels.next}
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    className="rounded-md bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
                                    onClick={() => router.push("/interviews/new")}
                                >
                                    {labels.restart}
                                </button>
                                <button
                                    onClick={() => router.push("/interviews")}
                                    className="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400"
                                >
                                    {labels.finish}
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
    labels,
}: {
    label: string;
    score: number | null;
    summary: string;
    labels: AppDictionary["interviewDetail"];
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
            ? labels.ratingOpen
            : resolvedScore >= 75
              ? labels.ratingGood
              : resolvedScore >= 50
                ? labels.ratingMedium
                : labels.ratingWeak;

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
    onStatusUpdate,
}: {
    interview: InterviewDetail;
    onOverallFeedbackChange: (
        overallFeedback: InterviewDetail["overallFeedback"]
    ) => void;
    onStatusUpdate: (status: InterviewStatusSnapshot) => void;
}) {
    const { dictionary } = useI18n();
    const labels = dictionary.interviewDetail;
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState("");
    const overallHydratePromiseRef = useRef<Promise<{
        overallFeedback: InterviewDetail["overallFeedback"];
        cvFeedback: InterviewDetail["cvFeedback"];
        interviewFeedback: Pick<
            NonNullable<InterviewDetail["feedback"]>,
            "overallScore" | "summary"
        > | null;
        codingChallenge: InterviewDetail["codingChallenge"];
    }> | null>(null);
    const overallGeneratePromiseRef = useRef<Promise<
        {
            overallFeedback: InterviewDetail["overallFeedback"];
            status: InterviewStatusSnapshot | null;
        }
    > | null>(null);
    const [detail, setDetail] = useState<{
        overallFeedback: InterviewDetail["overallFeedback"];
        cvFeedback: InterviewDetail["cvFeedback"];
        interviewFeedback: Pick<
            NonNullable<InterviewDetail["feedback"]>,
            "overallScore" | "summary"
        > | null;
        codingChallenge: InterviewDetail["codingChallenge"];
    } | null>(null);
    const effectiveOverallFeedback =
        detail?.overallFeedback ?? interview.overallFeedback;
    const effectiveCvFeedback = detail?.cvFeedback ?? interview.cvFeedback;
    const effectiveInterviewFeedback =
        detail?.interviewFeedback ?? interview.feedback;
    const effectiveCodingChallenge =
        detail?.codingChallenge ?? interview.codingChallenge;
    const canGenerateOverallFeedback =
        Boolean(effectiveCvFeedback) &&
        Boolean(effectiveInterviewFeedback) &&
        Boolean(effectiveCodingChallenge?.evaluation);

    useEffect(() => {
        let cancelled = false;

        async function hydrateOverallDetail() {
            try {
                const requestPromise =
                    overallHydratePromiseRef.current ??
                    (async () => {
                        const response = await fetch(
                            `/api/interviews/${interview.id}/overall`,
                            {
                                method: "GET",
                                cache: "no-store",
                            }
                        );
                        const data = (await response.json().catch(() => null)) as
                            | {
                                  overallFeedback?: InterviewDetail["overallFeedback"];
                                  cvFeedback?: InterviewDetail["cvFeedback"];
                                  interviewFeedback?: Pick<
                                      NonNullable<InterviewDetail["feedback"]>,
                                      "overallScore" | "summary"
                                  > | null;
                                  codingChallenge?: InterviewDetail["codingChallenge"];
                                  error?: string;
                              }
                            | null;

                        if (!response.ok || !data) {
                            throw new Error(
                                data?.error ||
                                    labels.overallLoadError
                            );
                        }

                        return {
                            overallFeedback: data.overallFeedback ?? null,
                            cvFeedback: data.cvFeedback ?? null,
                            interviewFeedback: data.interviewFeedback ?? null,
                            codingChallenge: data.codingChallenge ?? null,
                        };
                    })();
                overallHydratePromiseRef.current = requestPromise;
                const payload = await requestPromise;

                if (!cancelled) {
                    setDetail(payload);
                    setGenerationError("");
                }
            } catch (error) {
                if (!cancelled) {
                    setGenerationError(
                        error instanceof Error
                            ? error.message
                        : labels.overallLoadError
                    );
                }
            } finally {
                overallHydratePromiseRef.current = null;
            }
        }

        void hydrateOverallDetail();

        return () => {
            cancelled = true;
        };
    }, [interview.id, labels.overallLoadError]);

    useEffect(() => {
        if (!canGenerateOverallFeedback || effectiveOverallFeedback || isGenerating) {
            return;
        }

        let cancelled = false;

        async function generateOverallFeedback() {
            setIsGenerating(true);
            setGenerationError("");

            try {
                const requestPromise =
                    overallGeneratePromiseRef.current ??
                    (async () => {
                        const response = await fetch(
                            "/api/interview/overall-feedback",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    interviewId: interview.id,
                                }),
                            }
                        );
                        const data = (await response.json().catch(() => null)) as
                            | {
                                  overallFeedback?: InterviewDetail["overallFeedback"];
                                  status?: InterviewStatusSnapshot | null;
                                  error?: string;
                              }
                            | null;

                        if (!response.ok || !data?.overallFeedback) {
                            throw new Error(
                                data?.error ||
                                    labels.overallCreateError
                            );
                        }

                        return {
                            overallFeedback: data.overallFeedback,
                            status: data.status ?? null,
                        };
                    })();
                overallGeneratePromiseRef.current = requestPromise;
                const { overallFeedback, status } = await requestPromise;

                if (!cancelled) {
                    setDetail((currentDetail) => ({
                        overallFeedback,
                        cvFeedback: currentDetail?.cvFeedback ?? effectiveCvFeedback,
                        interviewFeedback:
                            currentDetail?.interviewFeedback ??
                            effectiveInterviewFeedback,
                        codingChallenge:
                            currentDetail?.codingChallenge ??
                            effectiveCodingChallenge,
                    }));
                    onOverallFeedbackChange(overallFeedback);
                    if (status) {
                        onStatusUpdate(status);
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    setGenerationError(
                        error instanceof Error
                            ? error.message
                            : labels.overallCreateError
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsGenerating(false);
                }
                overallGeneratePromiseRef.current = null;
            }
        }

        void generateOverallFeedback();

        return () => {
            cancelled = true;
        };
    }, [
        canGenerateOverallFeedback,
        effectiveCodingChallenge,
        effectiveCvFeedback,
        effectiveInterviewFeedback,
        effectiveOverallFeedback,
        interview.id,
        isGenerating,
        onOverallFeedbackChange,
        onStatusUpdate,
        labels.overallCreateError,
        labels.overallLoadError,
    ]);

    const cards = [
        {
            label: "CV",
            score:
                effectiveOverallFeedback?.cvScore ??
                effectiveCvFeedback?.quality.overallScore ??
                null,
            summary:
                effectiveCvFeedback?.roleAnalysis.summary ||
                labels.noCvFeedback,
        },
        {
            label: "Interview",
            score:
                effectiveOverallFeedback?.interviewScore ??
                effectiveInterviewFeedback?.overallScore ??
                null,
            summary:
                effectiveInterviewFeedback?.summary ||
                labels.noInterviewFeedback,
        },
        {
            label: "Code",
            score:
                effectiveOverallFeedback?.codingChallengeScore ??
                effectiveCodingChallenge?.evaluation?.overallScore ??
                null,
            summary:
                effectiveCodingChallenge?.evaluation?.summary ||
                labels.noCodingFeedback,
        },
    ];

    return (
        <div>
            <h2 className="text-lg font-semibold">{labels.overallTitle}</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
                {cards.map((item) => (
                    <SummaryCard
                        key={item.label}
                        label={item.label}
                        score={item.score}
                        summary={item.summary}
                        labels={labels}
                    />
                ))}
            </div>

            {isGenerating ? (
                <div className="mt-4 rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
                    {labels.overallGenerating}
                </div>
            ) : generationError ? (
                <div className="mt-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-200">
                    {generationError}
                </div>
            ) : effectiveOverallFeedback ? (
                <div className="mt-4 space-y-4">
                    <div className="rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
                        <div className="flex items-center justify-between gap-4">
                            <p>{effectiveOverallFeedback.summary}</p>
                            <span className="rounded-md bg-indigo-500/20 px-2 py-1 text-xs text-indigo-200">
                                {effectiveOverallFeedback.overallScore}%
                            </span>
                        </div>
                    </div>

                    <div className="rounded-lg bg-green-500/10 p-4">
                        <p className="mb-2 text-sm font-medium text-green-300">
                            {labels.positive}
                        </p>
                        <ul className="space-y-1 text-sm text-green-200">
                            {effectiveOverallFeedback.strengths.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-lg bg-red-500/10 p-4">
                        <p className="mb-2 text-sm font-medium text-red-300">
                            {labels.improvement}
                        </p>
                        <ul className="space-y-1 text-sm text-red-200">
                            {[
                                ...effectiveOverallFeedback.issues,
                                ...effectiveOverallFeedback.improvements,
                            ].map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="mt-4 rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
                    {labels.overallMissing}
                </div>
            )}
        </div>
    );
}

function InterviewDetailPageContent() {
    const { dictionary } = useI18n();
    const labels = dictionary.interviewDetail;
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
    const refreshInFlightRef = useRef(false);
    const statusRefreshInFlightRef = useRef(false);

    const refreshInterview = useCallback(
        async (options?: {
            syncStep?: boolean;
            showLoading?: boolean;
            force?: boolean;
        }) => {
            const {
                syncStep = false,
                showLoading = false,
                force = false,
            } = options ?? {};

            // Verhindert überlappende Detail-Requests, wenn Polling und UI
            // fast gleichzeitig dieselben Daten nachladen wollen.
            if (refreshInFlightRef.current && !force) {
                return;
            }

            refreshInFlightRef.current = true;

            if (showLoading) {
                setLoading(true);
                setError("");
            }

            try {
                const nextInterview = await fetchInterviewDetail(
                    interviewId,
                    labels.loadError
                );
                setInterview(nextInterview);

                if (syncStep) {
                    setStep(nextInterview.currentStep || 1);
                }
            } catch (interviewError) {
                setError(
                    interviewError instanceof Error
                        ? interviewError.message
                        : labels.loadError
                );
                throw interviewError;
            } finally {
                refreshInFlightRef.current = false;

                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [interviewId, labels.loadError]
    );

    const refreshInterviewStatus = useCallback(
        async (options?: {
            syncStep?: boolean;
            force?: boolean;
        }) => {
            const { syncStep = false, force = false } = options ?? {};

            if (statusRefreshInFlightRef.current && !force) {
                return;
            }

            statusRefreshInFlightRef.current = true;

            try {
                const nextStatus = await fetchInterviewStatus(
                    interviewId,
                    labels.statusLoadError
                );
                setInterview((currentInterview) =>
                    currentInterview
                        ? mergeInterviewStatus(currentInterview, nextStatus)
                        : currentInterview
                );

                if (syncStep) {
                    setStep(nextStatus.currentStep || 1);
                }
            } catch (statusError) {
                setError(
                    statusError instanceof Error
                        ? statusError.message
                        : labels.statusLoadError
                );
                throw statusError;
            } finally {
                statusRefreshInFlightRef.current = false;
            }
        },
        [interviewId, labels.statusLoadError]
    );

    const applyRuntimeStatus = useCallback((nextStatus: InterviewStatusSnapshot) => {
        setInterview((currentInterview) =>
            currentInterview
                ? mergeInterviewStatus(currentInterview, nextStatus)
                : currentInterview
        );
    }, []);

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
                            : labels.loadError
                    );
                }
            }
        }

        void hydrateInterview();

        return () => {
            cancelled = true;
        };
    }, [interviewId, labels.loadError, refreshInterview]);

    useEffect(() => {
        let cancelled = false;
        let timeoutId: number | null = null;

        const currentStep = interview?.currentStep ?? 1;
        const shouldPoll =
            interview?.transcript?.transcriptStatus === "transcribing" ||
            (currentStep === 1 && !interview?.hasCvFeedback) ||
            (currentStep === 3 && !interview?.hasInterviewFeedback) ||
            (currentStep === 4 && !interview?.hasCodingEvaluation) ||
            (currentStep === 6 && !interview?.hasOverallFeedback);

        async function scheduleRefresh() {
            if (!shouldPoll || cancelled) {
                return;
            }

            const delayMs = document.visibilityState === "hidden" ? 60_000 : 15_000;

            timeoutId = window.setTimeout(async () => {
                try {
                    // Bedingtes Polling lädt nur den Status-Snapshot, damit
                    // Navigation aktuell bleibt, ohne Shell- oder Detaildaten
                    // mitzuziehen.
                    await refreshInterviewStatus();
                } catch {
                    // Silent background refresh keeps step gating aligned with persisted data.
                }

                if (!cancelled) {
                    await scheduleRefresh();
                }
            }, delayMs);
        }

        void scheduleRefresh();

        return () => {
            cancelled = true;
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [
        interview?.currentStep,
        interview?.hasCodingEvaluation,
        interview?.hasCvFeedback,
        interview?.hasInterviewFeedback,
        interview?.hasOverallFeedback,
        interview?.transcript?.transcriptStatus,
        refreshInterviewStatus,
    ]);

    const config = useMemo(
        () =>
            interview
                ? {
                      role: interview.role,
                      experience: interview.experience,
                      companySize: interview.companySize,
                  }
                : {
                      role: "Backend-Entwickler",
                      experience: "",
                      companySize: "",
                  },
        [interview]
    );

    async function persistStep(nextStep: number, extraData?: Record<string, unknown>) {
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
                    ...extraData,
                }),
            });

            if (!response.ok) {
                throw new Error(labels.stepSaveError);
            }

            const data = (await response.json().catch(() => null)) as
                | {
                      status?: InterviewStatusSnapshot;
                  }
                | null;
            const refreshedStatus =
                data?.status ??
                (await fetchInterviewStatus(interviewId, labels.statusLoadError));
            setInterview((currentInterview) =>
                currentInterview
                    ? mergeInterviewStatus(currentInterview, refreshedStatus)
                    : currentInterview
            );
            setStep(refreshedStatus.currentStep || boundedStep);
        } catch (persistError) {
            setError(
                persistError instanceof Error
                    ? persistError.message
                    : labels.stepSaveError
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
                        {error || labels.loadError}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <InterviewSessionProvider
            interviewId={interview.id}
            interviewMode={interview.interviewMode ?? "face"}
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
                onStatusUpdate={applyRuntimeStatus}
                onRefreshInterview={() => refreshInterviewStatus()}
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
