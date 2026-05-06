"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

import {
    FeedbackSurface,
    SectionHeading,
    StatusBadge,
} from "@/components/interviews/feedback/voice/FeedbackSurface";

export function FeedbackStateCard({
    transcriptStatus,
    transcriptError,
    analysisStatus,
    analysisError,
    showFaceAnalysis,
    labels,
}: {
    transcriptStatus: string;
    transcriptError: string;
    analysisStatus: "idle" | "loading" | "ready" | "error";
    analysisError: string;
    showFaceAnalysis: boolean;
    labels: AppDictionary["interviewFeedback"];
}) {
    if (analysisStatus === "loading") {
        return (
            <FeedbackSurface>
                <SectionHeading
                    eyebrow={labels.analysisEyebrow}
                    title={labels.analyzingTitle}
                    description={labels.analyzingDescription}
                    badge={<StatusBadge>{labels.gptRunning}</StatusBadge>}
                />
            </FeedbackSurface>
        );
    }

    if (analysisStatus === "error") {
        return (
            <FeedbackSurface>
                <SectionHeading
                    eyebrow={labels.analysisEyebrow}
                    title={labels.analysisFailedTitle}
                    description={analysisError || labels.analysisFailedDescription}
                    badge={
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                            {labels.analysisFailedTitle}
                        </span>
                    }
                />
            </FeedbackSurface>
        );
    }

    if (transcriptStatus === "transcribing") {
        return (
            <FeedbackSurface>
                <SectionHeading
                    eyebrow={labels.analysisEyebrow}
                    title={labels.transcriptPreparingTitle}
                    description={labels.transcriptPreparingDescription}
                    badge={<StatusBadge>{labels.transcription}</StatusBadge>}
                />
            </FeedbackSurface>
        );
    }

    if (transcriptStatus === "error") {
        return (
            <FeedbackSurface>
                <SectionHeading
                    eyebrow={labels.analysisEyebrow}
                    title={labels.transcriptUnavailableTitle}
                    description={
                        transcriptError || labels.transcriptUnavailableDescription
                    }
                    badge={
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                            {labels.analysisFailedTitle}
                        </span>
                    }
                />
            </FeedbackSurface>
        );
    }

    return (
        <FeedbackSurface>
            <SectionHeading
                eyebrow={labels.analysisEyebrow}
                title={labels.pendingTitle}
                description={
                    showFaceAnalysis
                        ? labels.pendingDescriptionWithFace
                        : labels.pendingDescription
                }
                badge={<StatusBadge>{transcriptStatus}</StatusBadge>}
            />
        </FeedbackSurface>
    );
}
