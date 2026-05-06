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
    const focusArea =
        evaluation.improvements[0] ??
        evaluation.issues[0] ??
        labels.summaryFocusFallback;
    const nextGoal =
        evaluation.improvements[1] ??
        evaluation.improvements[0] ??
        labels.summaryNextGoalFallback;

    return (
        <FeedbackSurface
            variant="highlight"
            className={`relative overflow-hidden ${tone.glow}`}
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                                {labels.runSummaryEyebrow}
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                                {labels.runSummaryTitle}
                            </h2>
                            <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-300">
                                {evaluation.summary}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <StatusBadge>{role}</StatusBadge>
                            {experience ? <StatusBadge>{experience}</StatusBadge> : null}
                            {companySize ? <StatusBadge>{companySize}</StatusBadge> : null}
                            <StatusBadge>
                                {evaluation.passedLikely
                                    ? labels.likelyMatch
                                    : labels.uncertain}
                            </StatusBadge>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
                        <SummaryCell
                            label={labels.summaryCurrentLevel}
                            value={tone.label}
                        />
                        <SummaryCell
                            label={labels.summaryFocusArea}
                            value={focusArea}
                        />
                        <SummaryCell
                            label={labels.summaryNextGoal}
                            value={nextGoal}
                        />
                    </div>
                </div>

                <div className="rounded-xl bg-gray-950/60 p-4 outline outline-1 outline-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-400">{labels.overallScore}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone.badge}`}>
                            {tone.label}
                        </span>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-end justify-between gap-3">
                            <p className="text-5xl font-semibold tracking-tight text-white">
                                {score}
                                <span className="text-2xl text-gray-500">%</span>
                            </p>
                            <p className="pb-2 text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
                                {labels.runScoreLabel}
                            </p>
                        </div>
                        <div className="mt-4">
                            <ProgressBar
                                value={evaluation.overallScore}
                                className={`${tone.bar} shadow-[0_0_18px_rgba(167,139,250,0.35)]`}
                                trackClassName="bg-white/10"
                            />
                            <div className="mt-2 flex justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-gray-600">
                                <span>0</span>
                                <span>{clampPercent(evaluation.overallScore).toFixed(0)}</span>
                                <span>100</span>
                            </div>
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
        <div className="min-w-0 rounded-lg bg-gray-950/45 px-4 py-3 outline outline-1 outline-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {label}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-gray-100">
                {value}
            </p>
        </div>
    );
}
