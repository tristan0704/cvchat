"use client";

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
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl bg-gray-950/45 px-4 py-3 outline outline-1 outline-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                {label}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-white">
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
    return (
        <FeedbackSurface variant="compact" className="bg-gray-800/35">
            <SectionHeading
                eyebrow={labels.timingEyebrow}
                title={labels.timingTitle}
                description={labels.timingDescription}
                badge={
                    <StatusBadge>
                        {hasTimingMetrics && timingMetrics
                            ? `${timingMetrics.answerCount} ${labels.answerCount}`
                            : labels.emptyTiming}
                    </StatusBadge>
                }
            />

            <div className="mt-5">
                {hasTimingMetrics && timingMetrics ? (
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
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
                            <CompactStat
                                label={labels.averageLatency}
                                value={formatMetricSeconds(
                                    timingMetrics.averageResponseLatencyMs
                                )}
                            />
                        </div>

                        <SpeakingPacingMeter metrics={timingMetrics} labels={labels} />

                        <div className="grid gap-3 md:grid-cols-3">
                            <CompactStat
                                label={labels.longestAnswer}
                                value={formatMetricSeconds(
                                    timingMetrics.longestAnswerDurationMs
                                )}
                            />
                            <CompactStat
                                label={labels.shortestAnswer}
                                value={formatMetricSeconds(
                                    timingMetrics.shortestAnswerDurationMs
                                )}
                            />
                            <CompactStat
                                label={labels.longestPause}
                                value={formatMetricSeconds(
                                    timingMetrics.longestResponseLatencyMs
                                )}
                            />
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">{labels.timingEmpty}</p>
                )}
            </div>
        </FeedbackSurface>
    );
}
