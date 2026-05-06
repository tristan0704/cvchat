"use client";

import { useState } from "react";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { formatCountdown } from "@/lib/questionpool";
import type { InterviewTimingMetrics } from "@/lib/voice-interview/core/types";
import {
    formatMetricSeconds,
    formatMetricWordsPerMinute,
} from "@/lib/voice-interview/core/formatters";

import {
    FeedbackSurface,
    SectionHeading,
    StatusBadge,
} from "@/components/interviews/feedback/voice/FeedbackSurface";
import { SpeakingPacingMeter } from "@/components/interviews/feedback/voice/SpeakingPacingMeter";

function CompactStat({
    label,
    value,
    variant = "default",
}: {
    label: string;
    value: string;
    variant?: "default" | "subtle";
}) {
    return (
        <div className={`rounded-xl px-4 py-3 outline outline-1 outline-white/10 ${variant === "subtle" ? "bg-gray-950/25" : "bg-gray-950/45"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                {label}
            </p>
            <p className={`mt-1 font-semibold tracking-tight text-white ${variant === "subtle" ? "text-lg" : "text-xl"}`}>
                {value}
            </p>
        </div>
    );
}

export function SpeakingAnalyticsSection({
    timingMetrics,
    hasTimingMetrics,
    labels,
}: {
    timingMetrics: InterviewTimingMetrics | null;
    hasTimingMetrics: boolean;
    labels: AppDictionary["interviewFeedback"];
}) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <FeedbackSurface className="p-4">
            <SectionHeading
                title={labels.timingTitle}
                badge={
                    <StatusBadge className="text-[10px] py-0.5 px-2">
                        {hasTimingMetrics && timingMetrics
                            ? `${timingMetrics.answerCount} ${labels.answerCount}`
                            : labels.emptyTiming}
                    </StatusBadge>
                }
            />

            <div className="mt-6">
                {hasTimingMetrics && timingMetrics ? (
                    <div className="space-y-6">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <CompactStat
                                label={labels.wordsPerMinute}
                                value={formatMetricWordsPerMinute(
                                    timingMetrics.candidateWordsPerMinute
                                )}
                            />
                            <CompactStat
                                label={labels.totalSpeechTime}
                                value={formatCountdown(
                                    Math.max(
                                        0,
                                        Math.round(timingMetrics.totalCandidateSpeechMs / 1_000)
                                    )
                                )}
                            />
                            <CompactStat
                                label={labels.answerCount}
                                value={String(timingMetrics.answerCount)}
                            />
                            <CompactStat
                                label={labels.averageAnswer}
                                value={formatMetricSeconds(
                                    timingMetrics.averageAnswerDurationMs
                                )}
                            />
                        </div>

                        <SpeakingPacingMeter metrics={timingMetrics} labels={labels} />

                        <div className="flex justify-center pt-2">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5 py-2 px-5 rounded-xl bg-white/5 outline outline-1 outline-white/10"
                            >
                                {showAdvanced ? labels.hideAdvancedMetrics : labels.showAdvancedMetrics}
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <CompactStat
                                    label={labels.averageLatency}
                                    value={formatMetricSeconds(
                                        timingMetrics.averageResponseLatencyMs
                                    )}
                                    variant="subtle"
                                />
                                <CompactStat
                                    label={labels.longestAnswer}
                                    value={formatMetricSeconds(
                                        timingMetrics.longestAnswerDurationMs
                                    )}
                                    variant="subtle"
                                />
                                <CompactStat
                                    label={labels.shortestAnswer}
                                    value={formatMetricSeconds(
                                        timingMetrics.shortestAnswerDurationMs
                                    )}
                                    variant="subtle"
                                />
                                <CompactStat
                                    label={labels.longestPause}
                                    value={formatMetricSeconds(
                                        timingMetrics.longestResponseLatencyMs
                                    )}
                                    variant="subtle"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-gray-500 text-center py-6">{labels.timingEmpty}</p>
                )}
            </div>
        </FeedbackSurface>
    );
}
