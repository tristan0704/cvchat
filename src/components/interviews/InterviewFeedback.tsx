"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { FaceAnalysisParameterReport, FaceAnalysisReport } from "@/lib/face-analysis";
import { buildInterviewTranscriptFingerprint } from "@/lib/interview-feedback-fetch/fingerprint";
import { useInterviewFeedbackAnalysis } from "@/lib/interview-feedback-fetch/use-interview-feedback-analysis";
import { useI18n } from "@/lib/i18n/context";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { formatCountdown } from "@/lib/questionpool";
import type {
    InterviewFeedbackEvaluation,
    InterviewFeedbackEvaluationDimension,
} from "@/lib/interview-feedback-fetch/types";
import { useInterviewSession } from "@/lib/interview-session/context";
import type { InterviewTimingMetrics } from "@/lib/voice-interview/core/types";
import {
    formatMetricSeconds,
    formatMetricWordsPerMinute,
} from "@/lib/voice-interview/core/formatters";

// Dateiübersicht:
// Dieser Step lädt Transcript, Timing, Interview-Feedback und Face-Analyse über
// getrennte Domain-Endpunkte. Ein lokaler In-flight-Guard verhindert doppelte
// Hydration, weil diese Datenblöcke größer sind als die Interview-Shell.

const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
});

type ScoreToneLabels = {
    scoreStrong: string;
    scoreSolid: string;
    scoreWeak: string;
};

function getScoreTone(score: number, labels: ScoreToneLabels) {
    if (score >= 75) {
        return {
            badge: "bg-green-500/20 text-green-300",
            bar: "bg-green-400",
            label: labels.scoreStrong,
        };
    }

    if (score >= 50) {
        return {
            badge: "bg-yellow-500/20 text-yellow-300",
            bar: "bg-yellow-400",
            label: labels.scoreSolid,
        };
    }

    return {
        badge: "bg-red-500/20 text-red-300",
        bar: "bg-red-400",
        label: labels.scoreWeak,
    };
}

function getFaceStatusTone(status: FaceAnalysisReport["overallStatus"]) {
    switch (status) {
        case "strong":
            return "bg-green-500/20 text-green-300";
        case "okay":
            return "bg-sky-500/20 text-sky-300";
        case "watch":
            return "bg-yellow-500/20 text-yellow-300";
        default:
            return "bg-red-500/20 text-red-300";
    }
}

function formatPercent(value: number) {
    return `${PERCENT_FORMATTER.format(value * 100)}%`;
}

function SurfaceCard({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 ${className}`.trim()}
        >
            {children}
        </section>
    );
}

function SubtlePanel({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-xl bg-gray-900/90 p-4 outline outline-1 outline-white/10 ${className}`.trim()}
        >
            {children}
        </div>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
    badge,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    badge?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                {eyebrow ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                        {eyebrow}
                    </p>
                ) : null}
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2>
                {description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                        {description}
                    </p>
                ) : null}
            </div>
            {badge}
        </div>
    );
}

function ScoreCard({
    title,
    value,
    feedback,
    toneLabels,
}: {
    title: string;
    value: InterviewFeedbackEvaluationDimension["score"];
    feedback: InterviewFeedbackEvaluationDimension["feedback"];
    toneLabels: ScoreToneLabels;
}) {
    const tone = getScoreTone(value, toneLabels);

    return (
        <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-100">{title}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone.badge}`}>
                    {value}%
                </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-800">
                <div
                    className={`h-2 rounded-full ${tone.bar}`}
                    style={{ width: `${value}%` }}
                />
            </div>

            <p className="mt-3 text-sm text-gray-300">{feedback}</p>
        </SurfaceCard>
    );
}

function ListCard({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: string[];
    emptyLabel: string;
}) {
    return (
        <SurfaceCard>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                {title}
            </p>

            <ul className="mt-3 space-y-2 text-sm text-gray-200">
                {items.length > 0 ? (
                    items.map((item, index) => (
                        <li
                            key={`${title}-${index}-${item}`}
                            className="rounded-lg bg-white/5 px-3 py-2"
                        >
                            {item}
                        </li>
                    ))
                ) : (
                    <li className="text-gray-500">{emptyLabel}</li>
                )}
            </ul>
        </SurfaceCard>
    );
}

function MetricCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <SubtlePanel>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {label}
            </p>
            <p className="mt-2 text-xl font-semibold text-white">{value}</p>
            {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
        </SubtlePanel>
    );
}

function FaceParameterCard({
    parameter,
}: {
    parameter: FaceAnalysisParameterReport;
}) {
    const tone = getFaceStatusTone(parameter.status);

    return (
        <SurfaceCard>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-gray-200">
                        {parameter.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                        {parameter.valueLabel}
                    </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${tone}`}>
                    {parameter.score.toFixed(0)}%
                </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-800">
                <div
                    className="h-2 rounded-full bg-indigo-400"
                    style={{ width: `${parameter.score}%` }}
                />
            </div>

            <p className="mt-3 text-sm text-gray-300">{parameter.summary}</p>
        </SurfaceCard>
    );
}

function AnalysisStateCard(args: {
    role: string;
    experience: string;
    companySize: string;
    transcriptStatus: string;
    transcriptError: string;
    analysisStatus: "idle" | "loading" | "ready" | "error";
    analysisError: string;
    overallScore: number | null;
    summary: string;
    passedLikely: boolean | null;
    showFaceAnalysis: boolean;
    toneLabels: ScoreToneLabels;
    labels: AppDictionary["interviewFeedback"];
}) {
    if (args.analysisStatus === "ready" && args.overallScore !== null) {
        const tone = getScoreTone(args.overallScore, args.toneLabels);

        return (
            <SurfaceCard>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                            <span>{args.role}</span>
                            {args.experience ? <span>{args.experience}</span> : null}
                            {args.companySize ? <span>{args.companySize}</span> : null}
                            <span>
                                {args.passedLikely
                                    ? args.labels.likelyMatch
                                    : args.labels.uncertain}
                            </span>
                        </div>

                        <h2 className="text-xl font-semibold text-white">
                            {args.labels.feedbackTitle}
                        </h2>
                        <p className="max-w-3xl text-sm text-gray-300">
                            {args.summary}
                        </p>
                    </div>

                    <SubtlePanel className="min-w-[220px]">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-gray-400">
                                {args.labels.overallScore}
                            </p>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${tone.badge}`}
                            >
                                {tone.label}
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-white">
                            {args.overallScore}%
                        </p>
                        <div className="mt-3 h-2 rounded-full bg-gray-800">
                            <div
                                className={`h-2 rounded-full ${tone.bar}`}
                                style={{ width: `${args.overallScore}%` }}
                            />
                        </div>
                    </SubtlePanel>
                </div>
            </SurfaceCard>
        );
    }

    if (args.analysisStatus === "loading") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow={args.labels.analysisEyebrow}
                    title={args.labels.analyzingTitle}
                    description={args.labels.analyzingDescription}
                    badge={
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                            {args.labels.gptRunning}
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    if (args.analysisStatus === "error") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow={args.labels.analysisEyebrow}
                    title={args.labels.analysisFailedTitle}
                    description={
                        args.analysisError ||
                        args.labels.analysisFailedDescription
                    }
                    badge={
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                            {args.labels.analysisFailedTitle}
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    if (args.transcriptStatus === "transcribing") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow={args.labels.analysisEyebrow}
                    title={args.labels.transcriptPreparingTitle}
                    description={args.labels.transcriptPreparingDescription}
                    badge={
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                            {args.labels.transcription}
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    if (args.transcriptStatus === "error") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow={args.labels.analysisEyebrow}
                    title={args.labels.transcriptUnavailableTitle}
                    description={
                        args.transcriptError ||
                        args.labels.transcriptUnavailableDescription
                    }
                    badge={
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                            {args.labels.analysisFailedTitle}
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    return (
        <SurfaceCard>
            <SectionHeading
                eyebrow={args.labels.analysisEyebrow}
                title={args.labels.pendingTitle}
                description={
                    args.showFaceAnalysis
                        ? args.labels.pendingDescriptionWithFace
                        : args.labels.pendingDescription
                }
                badge={
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                        {args.transcriptStatus}
                    </span>
                }
            />
        </SurfaceCard>
    );
}

type PersistedInterviewFeedbackState = {
    transcript: {
        transcriptStatus: string;
        transcriptError: string;
        transcriptExport: string;
        recapStatus: string;
        recapError: string;
        recapCaptureNote: string;
    } | null;
    timingMetrics: InterviewTimingMetrics | null;
    feedback: InterviewFeedbackEvaluation | null;
    faceAnalysis: FaceAnalysisReport | null;
};

type PersistedInterviewFeedbackPayload = {
    transcript: PersistedInterviewFeedbackState["transcript"];
    timingMetrics: InterviewTimingMetrics | null;
    feedback: InterviewFeedbackEvaluation | null;
    faceAnalysis: FaceAnalysisReport | null;
};

export default function InterviewFeedback({
    onEvaluationReady,
    onNavigationStateChange,
}: {
    onEvaluationReady?: () => void;
    onNavigationStateChange?: (message: string | null) => void;
}) {
    const { dictionary, language } = useI18n();
    const session = useInterviewSession();
    const interviewId = session.interviewId;
    const controller = session.voiceInterview;
    const showFaceAnalysis = session.interviewMode === "face";
    const role = session.role;
    const experience = session.config.experience ?? "";
    const companySize = session.config.companySize ?? "";
    const [persistedState, setPersistedState] =
        useState<PersistedInterviewFeedbackState | null>(null);
    const [loadError, setLoadError] = useState("");
    const hydratePromiseRef = useRef<Promise<PersistedInterviewFeedbackPayload> | null>(
        null
    );
    const timingPersistKeyRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function hydratePersistedInterview() {
            try {
                const requestPromise =
                    hydratePromiseRef.current ??
                    (async () => {
                        const [transcriptResponse, feedbackResponse] =
                            await Promise.all([
                                fetch(`/api/interviews/${interviewId}/transcript`, {
                                    method: "GET",
                                    cache: "no-store",
                                }),
                                fetch(`/api/interviews/${interviewId}/feedback`, {
                                    method: "GET",
                                    cache: "no-store",
                                }),
                            ]);
                        const transcriptData = (await transcriptResponse
                            .json()
                            .catch(() => null)) as
                            | {
                                  transcript?: PersistedInterviewFeedbackState["transcript"];
                                  timingMetrics?: InterviewTimingMetrics | null;
                                  error?: string;
                              }
                            | null;
                        const feedbackData = (await feedbackResponse
                            .json()
                            .catch(() => null)) as
                            | {
                                  feedback?: InterviewFeedbackEvaluation | null;
                                  faceAnalysis?: FaceAnalysisReport | null;
                                  error?: string;
                              }
                            | null;

                        if (!transcriptResponse.ok || !transcriptData) {
                            throw new Error(
                                transcriptData?.error ||
                                    "Persistierte Interviewdaten konnten nicht geladen werden."
                            );
                        }

                        if (!feedbackResponse.ok || !feedbackData) {
                            throw new Error(
                                feedbackData?.error ||
                                    "Persistierte Feedbackdaten konnten nicht geladen werden."
                            );
                        }

                        return {
                            transcript: transcriptData.transcript ?? null,
                            timingMetrics: transcriptData.timingMetrics ?? null,
                            feedback: feedbackData.feedback ?? null,
                            faceAnalysis: feedbackData.faceAnalysis ?? null,
                        };
                    })();
                hydratePromiseRef.current = requestPromise;
                const payload = await requestPromise;

                if (!cancelled) {
                    setPersistedState(payload);
                    setLoadError("");
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError(
                        error instanceof Error
                            ? error.message
                        : "Persistierte Interviewdaten konnten nicht geladen werden."
                    );
                }
            } finally {
                hydratePromiseRef.current = null;
            }
        }

        void hydratePersistedInterview();

        return () => {
            cancelled = true;
        };
    }, [interviewId]);

    useEffect(() => {
        if (!controller?.hasTimingMetrics) {
            return;
        }

        const timingPersistKey = JSON.stringify(controller.interviewTimingMetrics);
        if (timingPersistKeyRef.current === timingPersistKey) {
            return;
        }

        timingPersistKeyRef.current = timingPersistKey;

        void fetch(`/api/interviews/${interviewId}/timing`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(controller.interviewTimingMetrics),
        }).then(() => {
            setPersistedState((currentState) => ({
                transcript: currentState?.transcript ?? null,
                feedback: currentState?.feedback ?? null,
                faceAnalysis: currentState?.faceAnalysis ?? null,
                timingMetrics: controller.interviewTimingMetrics,
            }));
        });
    }, [controller?.hasTimingMetrics, controller?.interviewTimingMetrics, interviewId]);

    const transcriptExport = persistedState?.transcript?.transcriptExport ?? "";
    const transcriptStatus =
        persistedState?.transcript?.transcriptStatus ??
        controller?.postCallTranscriptStatus ??
        "idle";
    const transcriptError =
        persistedState?.transcript?.transcriptError ??
        controller?.postCallTranscriptError ??
        "";
    const recapStatus =
        controller?.interviewRecapStatus ??
        persistedState?.transcript?.recapStatus ??
        "idle";
    const recapError =
        controller?.interviewRecapError ??
        persistedState?.transcript?.recapError ??
        "";
    const recapCaptureNote =
        controller?.interviewRecapCaptureNote ??
        persistedState?.transcript?.recapCaptureNote ??
        "";
    const timingMetrics =
        controller?.hasTimingMetrics && controller.interviewTimingMetrics
            ? controller.interviewTimingMetrics
            : persistedState?.timingMetrics ?? null;
    const hasTimingMetrics = Boolean(
        timingMetrics &&
            (timingMetrics.answerCount > 0 ||
                timingMetrics.totalCandidateSpeechMs > 0 ||
                timingMetrics.averageResponseLatencyMs > 0)
    );

    const transcriptFingerprint = useMemo(
        () => buildInterviewTranscriptFingerprint(transcriptExport),
        [transcriptExport]
    );
    const analysisEnabled =
        transcriptStatus === "ready" &&
        transcriptExport.trim().length > 0;

    const analysis = useInterviewFeedbackAnalysis({
        interviewId,
        enabled: analysisEnabled,
        role,
        experience,
        companySize,
        transcript: transcriptExport,
        transcriptFingerprint,
        language,
        existingEvaluation: persistedState?.feedback ?? null,
    });

    useEffect(() => {
        if (!onNavigationStateChange) {
            return;
        }

        const navigationLockMessage =
            transcriptStatus === "recording" || transcriptStatus === "transcribing"
                ? dictionary.interviewFeedback.transcriptLock
                : analysis.status === "loading"
                  ? dictionary.interviewFeedback.feedbackLock
                  : null;

        onNavigationStateChange(navigationLockMessage);

        return () => {
            onNavigationStateChange(null);
        };
    }, [analysis.status, dictionary.interviewFeedback, onNavigationStateChange, transcriptStatus]);

    useEffect(() => {
        if (!analysis.evaluation) {
            return;
        }

        setPersistedState((currentState) => ({
            transcript: currentState?.transcript ?? null,
            timingMetrics: currentState?.timingMetrics ?? null,
            faceAnalysis: currentState?.faceAnalysis ?? null,
            feedback: analysis.evaluation,
        }));
        onEvaluationReady?.();
    }, [analysis.evaluation, onEvaluationReady]);

    const faceAnalysisReport = persistedState?.faceAnalysis ?? null;
    const evaluation = analysis.evaluation ?? persistedState?.feedback ?? null;

    return (
        <div className="space-y-6">
            {loadError ? <p className="text-sm text-red-300">{loadError}</p> : null}

            <AnalysisStateCard
                role={role}
                experience={experience}
                companySize={companySize}
                transcriptStatus={transcriptStatus}
                transcriptError={transcriptError}
                analysisStatus={analysis.status}
                analysisError={analysis.error}
                overallScore={evaluation?.overallScore ?? null}
                summary={evaluation?.summary ?? ""}
                passedLikely={evaluation?.passedLikely ?? null}
                showFaceAnalysis={showFaceAnalysis}
                toneLabels={dictionary.common}
                labels={dictionary.interviewFeedback}
            />

            {evaluation ? (
                <>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <ScoreCard
                            title={dictionary.interviewFeedback.communication}
                            value={evaluation.communication.score}
                            feedback={evaluation.communication.feedback}
                            toneLabels={dictionary.common}
                        />
                        <ScoreCard
                            title={dictionary.interviewFeedback.answerQuality}
                            value={evaluation.answerQuality.score}
                            feedback={evaluation.answerQuality.feedback}
                            toneLabels={dictionary.common}
                        />
                        <ScoreCard
                            title={dictionary.interviewFeedback.roleFit}
                            value={evaluation.roleFit.score}
                            feedback={evaluation.roleFit.feedback}
                            toneLabels={dictionary.common}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <ListCard
                            title={dictionary.interviewFeedback.strengths}
                            items={evaluation.strengths}
                            emptyLabel={dictionary.interviewFeedback.noStrengths}
                        />
                        <ListCard
                            title={dictionary.interviewFeedback.risks}
                            items={evaluation.issues}
                            emptyLabel={dictionary.interviewFeedback.noRisks}
                        />
                        <ListCard
                            title={dictionary.interviewFeedback.improvements}
                            items={evaluation.improvements}
                            emptyLabel={dictionary.interviewFeedback.noImprovements}
                        />
                    </div>
                </>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <SurfaceCard>
                    <SectionHeading
                        eyebrow={dictionary.interviewFeedback.replayEyebrow}
                        title={dictionary.interviewFeedback.replayTitle}
                        description={dictionary.interviewFeedback.replayDescription}
                        badge={
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                                {recapStatus}
                            </span>
                        }
                    />

                    <div className="mt-4">
                        {controller?.interviewRecapUrl ? (
                            <div className="space-y-3">
                                <audio
                                    controls
                                    preload="metadata"
                                    src={controller.interviewRecapUrl}
                                    className="w-full accent-indigo-500"
                                >
                                    {dictionary.interviewFeedback.audioUnsupported}
                                </audio>
                                <p className="text-sm text-gray-400">
                                    {dictionary.interviewFeedback.replayReadyDescription}
                                </p>
                            </div>
                        ) : recapStatus === "recording" ? (
                            <p className="text-sm text-gray-400">
                                {dictionary.interviewFeedback.replayRecording}
                            </p>
                        ) : recapStatus === "error" ? (
                            <p className="text-sm text-red-300">
                                {recapError ||
                                    dictionary.interviewFeedback.replayError}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400">
                                {dictionary.interviewFeedback.replayEmpty}
                            </p>
                        )}

                        {recapCaptureNote ? (
                            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                                {recapCaptureNote}
                            </p>
                        ) : null}
                    </div>
                </SurfaceCard>

                <SurfaceCard>
                    <SectionHeading
                        eyebrow={dictionary.interviewFeedback.transcriptEyebrow}
                        title={dictionary.interviewFeedback.transcriptTitle}
                        description={dictionary.interviewFeedback.transcriptDescription}
                        badge={
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                                {transcriptStatus}
                            </span>
                        }
                    />

                    <div className="mt-4">
                        {transcriptExport ? (
                            <SubtlePanel className="max-h-[420px] overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-200">
                                    {transcriptExport}
                                </pre>
                            </SubtlePanel>
                        ) : transcriptStatus === "transcribing" ? (
                            <p className="text-sm text-gray-400">
                                {dictionary.interviewFeedback.transcriptCreating}
                            </p>
                        ) : transcriptStatus === "error" ? (
                            <p className="text-sm text-red-300">
                                {transcriptError ||
                                    dictionary.interviewFeedback.transcriptCreateError}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400">
                                {dictionary.interviewFeedback.transcriptEmpty}
                            </p>
                        )}
                    </div>
                </SurfaceCard>
            </div>

            <SurfaceCard>
                <SectionHeading
                    eyebrow={dictionary.interviewFeedback.timingEyebrow}
                    title={dictionary.interviewFeedback.timingTitle}
                    description={dictionary.interviewFeedback.timingDescription}
                    badge={
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                            {hasTimingMetrics && timingMetrics
                                ? `${timingMetrics.answerCount} ${dictionary.interviewFeedback.answerCount}`
                                : dictionary.interviewFeedback.emptyTiming}
                        </span>
                    }
                />

                <div className="mt-4">
                    {hasTimingMetrics && timingMetrics ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                label={dictionary.interviewFeedback.totalSpeechTime}
                                value={formatCountdown(
                                    Math.max(
                                        0,
                                        Math.round(
                                            timingMetrics.totalCandidateSpeechMs /
                                                1_000
                                        )
                                    )
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.wordsPerMinute}
                                value={formatMetricWordsPerMinute(
                                    timingMetrics.candidateWordsPerMinute
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.averageAnswer}
                                value={formatMetricSeconds(
                                    timingMetrics.averageAnswerDurationMs
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.longestAnswer}
                                value={formatMetricSeconds(
                                    timingMetrics.longestAnswerDurationMs
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.shortestAnswer}
                                value={formatMetricSeconds(
                                    timingMetrics.shortestAnswerDurationMs
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.averageLatency}
                                value={formatMetricSeconds(
                                    timingMetrics.averageResponseLatencyMs
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.longestPause}
                                value={formatMetricSeconds(
                                    timingMetrics.longestResponseLatencyMs
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.answerCount}
                                value={String(timingMetrics.answerCount)}
                            />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">
                            {dictionary.interviewFeedback.timingEmpty}
                        </p>
                    )}
                </div>
            </SurfaceCard>

            {showFaceAnalysis ? (
                <SurfaceCard>
                    <SectionHeading
                    eyebrow={dictionary.interviewFeedback.faceEyebrow}
                    title={dictionary.interviewFeedback.faceTitle}
                    description={dictionary.interviewFeedback.faceDescription}
                    badge={
                        faceAnalysisReport ? (
                            <span
                                className={`rounded-full px-3 py-1 text-xs ${getFaceStatusTone(
                                    faceAnalysisReport.overallStatus
                                )}`}
                            >
                                {faceAnalysisReport.overallScore.toFixed(0)}%
                            </span>
                        ) : (
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                                {dictionary.interviewFeedback.noData}
                            </span>
                        )
                    }
                    />

                {faceAnalysisReport ? (
                    <div className="mt-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                label={dictionary.interviewFeedback.headline}
                                value={faceAnalysisReport.summary.headline}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.faceInFrame}
                                value={formatPercent(
                                    faceAnalysisReport.globalMetrics.faceDetectedPct
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.speakingActivity}
                                value={formatPercent(
                                    faceAnalysisReport.globalMetrics
                                        .speakingActivityPct
                                )}
                            />
                            <MetricCard
                                label={dictionary.interviewFeedback.blinkRate}
                                value={`${NUMBER_FORMATTER.format(
                                    faceAnalysisReport.globalMetrics
                                        .blinkRatePerMin
                                )}/min`}
                            />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            {faceAnalysisReport.parameters.map((parameter) => (
                                <FaceParameterCard
                                    key={parameter.key}
                                    parameter={parameter}
                                />
                            ))}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <ListCard
                                title={dictionary.interviewFeedback.strengths}
                                items={faceAnalysisReport.summary.strengths}
                                emptyLabel={dictionary.interviewFeedback.specialStrengths}
                            />
                            <ListCard
                                title={dictionary.interviewFeedback.risks}
                                items={faceAnalysisReport.summary.risks}
                                emptyLabel={dictionary.interviewFeedback.specialRisks}
                            />
                            <ListCard
                                title={dictionary.interviewFeedback.nextSteps}
                                items={faceAnalysisReport.summary.nextSteps}
                                emptyLabel={dictionary.interviewFeedback.noNextSteps}
                            />
                        </div>

                        {faceAnalysisReport.alerts.length > 0 ? (
                            <ListCard
                                title="Hinweise"
                                items={faceAnalysisReport.alerts.map(
                                    (alert) => alert.message
                                )}
                                emptyLabel="Keine Hinweise vorhanden."
                            />
                        ) : null}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-400">
                        Für dieses Interview sind noch keine Face-Metriken
                        verfügbar. Aktiviere im Live-Call die Kamera, damit die
                        Face-Auswertung Daten sammeln kann.
                    </p>
                )}
                </SurfaceCard>
            ) : null}
        </div>
    );
}
