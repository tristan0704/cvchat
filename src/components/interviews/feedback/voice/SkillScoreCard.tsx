"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { InterviewFeedbackEvaluationDimension } from "@/lib/interview-feedback-fetch/types";

import {
    ProgressBar,
    getScoreTone,
} from "@/components/interviews/feedback/voice/FeedbackSurface";

export function SkillScoreCard({
    title,
    dimension,
    labels,
    commonLabels,
}: {
    title: string;
    dimension: InterviewFeedbackEvaluationDimension;
    labels: AppDictionary["interviewFeedback"];
    commonLabels: AppDictionary["common"];
}) {
    const tone = getScoreTone(dimension.score, commonLabels);
    const interpretation =
        dimension.score >= 75
            ? labels.skillInterpretationStrong
            : dimension.score >= 50
              ? labels.skillInterpretationSolid
              : labels.skillInterpretationWeak;

    return (
        <article className="flex h-full min-h-[168px] flex-col justify-between rounded-xl bg-gray-950/45 p-4 outline outline-1 outline-white/10">
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 text-sm font-semibold text-white">{title}</p>
                    <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${tone.badge}`}
                    >
                        {Math.round(dimension.score)}%
                    </span>
                </div>

                <ProgressBar
                    value={dimension.score}
                    className={tone.bar}
                    trackClassName="bg-white/10"
                />
                <p className="text-xs leading-5 text-gray-500">{interpretation}</p>
            </div>
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-300">
                {dimension.feedback}
            </p>
        </article>
    );
}
