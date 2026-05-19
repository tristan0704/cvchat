"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";

import {
    CvFeedbackSurface,
    CvStatusBadge,
    getCvScoreTone,
} from "@/components/cv/feedback/CvFeedbackSurface";

export function CvFeedbackSummaryHero({
    result,
    config,
    labels,
    commonLabels,
}: {
    result: CvFeedbackResult;
    config: InterviewCvConfig;
    labels: AppDictionary["cvFeedback"];
    commonLabels: AppDictionary["common"];
}) {
    const score = Math.round(result.quality.overallScore);
    const tone = getCvScoreTone(score, commonLabels);
    const focusArea =
        result.quality.improvements[0] ??
        result.roleAnalysis.missingMustHave[0] ??
        labels.summaryFocusFallback;
    const nextGoal =
        result.quality.improvements[1] ??
        result.quality.improvements[0] ??
        labels.summaryNextGoalFallback;

    return (
        <CvFeedbackSurface className="!p-0 overflow-hidden">
            <div className="flex flex-col items-stretch md:flex-row">
                <div className="min-w-0 flex-1 space-y-6 p-6 md:p-8">
                    <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <CvStatusBadge className="bg-indigo-500/10 text-indigo-300 outline-indigo-300/20">
                                {config.role || labels.unknownRole}
                            </CvStatusBadge>
                            {config.experience ? (
                                <CvStatusBadge>{config.experience}</CvStatusBadge>
                            ) : null}
                            {config.companySize ? (
                                <CvStatusBadge>{config.companySize}</CvStatusBadge>
                            ) : null}
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}
                            >
                                {tone.label}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                            {labels.reportTitle}
                        </h2>
                        <p className="mt-4 text-sm leading-relaxed text-gray-300">
                            {result.roleAnalysis.summary}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <SummaryCell label={labels.summaryFocusArea} value={focusArea} />
                        <SummaryCell label={labels.summaryNextGoal} value={nextGoal} />
                    </div>
                </div>

                <div className="flex shrink-0 flex-col items-center justify-center border-t border-white/5 bg-white/[0.02] p-6 md:w-[250px] md:border-l md:border-t-0 md:p-8">
                    <div className="relative">
                        <svg className="size-36 -rotate-90">
                            <circle
                                cx="72"
                                cy="72"
                                r="64"
                                className="fill-none stroke-white/5 stroke-[8]"
                            />
                            <circle
                                cx="72"
                                cy="72"
                                r="64"
                                className={`fill-none ${tone.bar} stroke-[8] transition-all duration-1000 ease-out`}
                                style={{
                                    strokeDasharray: 402,
                                    strokeDashoffset:
                                        402 - (402 * result.quality.overallScore) / 100,
                                    strokeLinecap: "round",
                                }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold leading-none tracking-tighter text-white">
                                {score}%
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                {labels.overallScoreLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </CvFeedbackSurface>
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
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">
                {label}
            </p>
            <p className="text-sm font-medium leading-relaxed text-gray-200">
                {value}
            </p>
        </div>
    );
}
