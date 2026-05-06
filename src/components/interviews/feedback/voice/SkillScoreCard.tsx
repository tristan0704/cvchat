"use client";

import { useState } from "react";
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
    const [isExpanded, setIsExpanded] = useState(false);
    const tone = getScoreTone(dimension.score, commonLabels);
    const interpretation =
        dimension.score >= 75
            ? labels.skillInterpretationStrong
            : dimension.score >= 50
              ? labels.skillInterpretationSolid
              : labels.skillInterpretationWeak;

    return (
        <article className="flex flex-col rounded-xl bg-white/[0.02] p-4 outline outline-1 outline-white/5">
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 text-sm font-semibold text-white">{title}</p>
                    <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}
                    >
                        {Math.round(dimension.score)}%
                    </span>
                </div>

                <ProgressBar
                    value={dimension.score}
                    className={tone.bar}
                    trackClassName="bg-white/5"
                />
                
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium text-gray-500">{interpretation}</p>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        {isExpanded ? labels.hideDetails : labels.showDetails}
                    </button>
                </div>
            </div>
            
            {isExpanded && (
                <p className="mt-4 text-xs leading-relaxed text-gray-400 animate-in fade-in slide-in-from-top-1 duration-200">
                    {dimension.feedback}
                </p>
            )}
        </article>
    );
}
