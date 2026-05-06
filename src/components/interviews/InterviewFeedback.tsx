"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FaceAnalysisSection } from "@/components/interviews/feedback/voice/FaceAnalysisSection";
import { FeedbackStateCard } from "@/components/interviews/feedback/voice/FeedbackStateCard";
import { FeedbackSummaryHero } from "@/components/interviews/feedback/voice/FeedbackSummaryHero";
import { InterviewReplayCard } from "@/components/interviews/feedback/voice/InterviewReplayCard";
import { PracticePlanSection } from "@/components/interviews/feedback/voice/PracticePlanSection";
import { SkillBreakdownSection } from "@/components/interviews/feedback/voice/SkillBreakdownSection";
import { SpeakingAnalyticsSection } from "@/components/interviews/feedback/voice/SpeakingAnalyticsSection";
import type { FaceAnalysisReport } from "@/lib/face-analysis";
import { buildInterviewTranscriptFingerprint } from "@/lib/interview-feedback-fetch/fingerprint";
import type { InterviewFeedbackEvaluation } from "@/lib/interview-feedback-fetch/types";
import { useInterviewFeedbackAnalysis } from "@/lib/interview-feedback-fetch/use-interview-feedback-analysis";
import { useInterviewSession } from "@/lib/interview-session/context";
import { useI18n } from "@/lib/i18n/context";
import type { InterviewTimingMetrics } from "@/lib/voice-interview/core/types";

// Dateiübersicht:
// Dieser Step hält die Interview-Feedback-Datenlogik zusammen. Die sichtbare
// Report-UI lebt in feedback/voice, damit Transcript, Persistenz und GPT-
// Evaluation getrennt von der Darstellung bleiben.

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
    const labels = dictionary.interviewFeedback;
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
                                transcriptData?.error || labels.persistedLoadError
                            );
                        }

                        if (!feedbackResponse.ok || !feedbackData) {
                            throw new Error(
                                feedbackData?.error || labels.persistedFeedbackLoadError
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
                            : labels.persistedLoadError
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
    }, [interviewId, labels.persistedFeedbackLoadError, labels.persistedLoadError]);

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
        });

        setPersistedState((currentState) => ({
            transcript: currentState?.transcript ?? null,
            feedback: currentState?.feedback ?? null,
            faceAnalysis: currentState?.faceAnalysis ?? null,
            timingMetrics: controller.interviewTimingMetrics,
        }));
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
                ? labels.transcriptLock
                : analysis.status === "loading"
                  ? labels.feedbackLock
                  : null;

        onNavigationStateChange(navigationLockMessage);

        return () => {
            onNavigationStateChange(null);
        };
    }, [analysis.status, labels.feedbackLock, labels.transcriptLock, onNavigationStateChange, transcriptStatus]);

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

    const faceAnalysisReport = showFaceAnalysis
        ? persistedState?.faceAnalysis ?? null
        : null;
    const evaluation = analysis.evaluation ?? persistedState?.feedback ?? null;

    return (
        <div className="space-y-6">
            {loadError ? (
                <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300 outline outline-1 outline-red-500/20">
                    {loadError}
                </div>
            ) : null}

            {evaluation ? (
                <>
                    <FeedbackSummaryHero
                        role={role}
                        experience={experience}
                        companySize={companySize}
                        evaluation={evaluation}
                        labels={labels}
                        commonLabels={dictionary.common}
                    />

                    <SkillBreakdownSection
                        evaluation={evaluation}
                        labels={labels}
                        commonLabels={dictionary.common}
                    />

                    <PracticePlanSection evaluation={evaluation} labels={labels} />
                </>
            ) : (
                <FeedbackStateCard
                    transcriptStatus={transcriptStatus}
                    transcriptError={transcriptError}
                    analysisStatus={analysis.status}
                    analysisError={analysis.error}
                    showFaceAnalysis={showFaceAnalysis}
                    labels={labels}
                />
            )}

            <InterviewReplayCard
                audioUrl={controller?.interviewRecapUrl}
                recapStatus={recapStatus}
                recapError={recapError}
                recapCaptureNote={recapCaptureNote}
                labels={labels}
            />

            {showFaceAnalysis ? (
                <FaceAnalysisSection report={faceAnalysisReport} labels={labels} />
            ) : null}

            <SpeakingAnalyticsSection
                timingMetrics={timingMetrics}
                hasTimingMetrics={hasTimingMetrics}
                labels={labels}
            />
        </div>
    );
}
