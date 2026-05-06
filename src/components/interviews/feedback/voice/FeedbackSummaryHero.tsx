"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { InterviewFeedbackEvaluation } from "@/lib/interview-feedback-fetch/types";

import {
    FeedbackSurface,
    ProgressBar,
    StatusBadge,
    clampPercent,
    getScoreTone,
} from "@/components/interviews/feedback/voice/FeedbackSurface";

export function FeedbackSummaryHero({
    role,
    experience,
    companySize,
    evaluation,
    labels,
    commonLabels,
}: {
    role: string;
    experience: string;
    companySize: string;
    evaluation: InterviewFeedbackEvaluation;
    labels: AppDictionary["interviewFeedback"];
    commonLabels: AppDictionary["common"];
}) {
    const tone = getScoreTone(evaluation.overallScore, commonLabels);
    const score = Math.round(evaluation.overallScore);

    return (
        <FeedbackSurface className="!p-0 overflow-hidden">
            <div className="flex flex-col md:flex-row items-stretch">
                {/* Content Section */}
                <div className="flex-1 p-6 md:p-8 space-y-6">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                            <StatusBadge className="bg-indigo-500/10 text-indigo-300 outline-indigo-300/20">
                                {role}
                            </StatusBadge>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}>
                                {evaluation.passedLikely ? labels.likelyMatch : labels.uncertain}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                            {labels.runSummaryTitle}
                        </h2>
                        <p className="mt-4 text-sm leading-relaxed text-gray-300">
                            {evaluation.summary}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <SummaryCell
                            label={labels.summaryFocusArea}
                            value={evaluation.improvements[0] ?? evaluation.issues[0] ?? labels.summaryFocusFallback}
                        />
                        <SummaryCell
                            label={labels.summaryNextGoal}
                            value={evaluation.improvements[1] ?? evaluation.improvements[0] ?? labels.summaryNextGoalFallback}
                        />
                    </div>
                </div>

                {/* Score Section */}
                <div className="flex flex-col items-center justify-center p-8 md:p-10 bg-white/[0.02] md:w-[240px] shrink-0 border-t md:border-t-0 md:border-l border-white/5">
                    <div className="relative">
                        <svg className="size-32 -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="58"
                                className="fill-none stroke-white/5 stroke-[8]"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="58"
                                className={`fill-none ${tone.bar} stroke-[8] transition-all duration-1000 ease-out`}
                                style={{
                                    strokeDasharray: 364,
                                    strokeDashoffset: 364 - (364 * evaluation.overallScore) / 100,
                                    strokeLinecap: "round",
                                }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold tracking-tighter text-white">
                                {score}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                {labels.runScoreLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </FeedbackSurface>
    );
}

function SummaryCell({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0 rounded-xl bg-gray-950/20 p-4 outline outline-1 outline-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
                {label}
            </p>
            <p className="text-sm font-medium leading-relaxed text-gray-200">
                {value}
            </p>
        </div>
    );
}
