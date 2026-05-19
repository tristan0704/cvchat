"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { InterviewFeedbackEvaluation } from "@/lib/interview-feedback-fetch/types";

import {
    FeedbackSurface,
    SectionHeading,
    StatusBadge,
} from "@/components/interviews/feedback/voice/FeedbackSurface";

function buildPracticeItems(evaluation: InterviewFeedbackEvaluation) {
    const seen = new Set<string>();
    const combined = [...evaluation.improvements, ...evaluation.issues];
    const items: string[] = [];

    for (const item of combined) {
        const trimmed = item.trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }

        seen.add(trimmed);
        items.push(trimmed);
        if (items.length >= 3) {
            break;
        }
    }

    return items;
}

export function PracticePlanSection({
    evaluation,
    labels,
}: {
    evaluation: InterviewFeedbackEvaluation;
    labels: AppDictionary["interviewFeedback"];
}) {
    const items = buildPracticeItems(evaluation);
    const focusItem = items[0] ?? labels.practicePlanEmpty;
    const nextItems = items.slice(1);

    return (
        <FeedbackSurface className="space-y-6">
            <SectionHeading
                title={labels.practicePlanTitle}
                badge={<StatusBadge className="bg-indigo-500/10 text-indigo-300 outline-indigo-300/20">{labels.nextRun}</StatusBadge>}
            />

            <div className="space-y-4">
                {items.length > 0 ? (
                    <>
                        {/* Primary Focus */}
                        <div className="relative rounded-xl bg-indigo-500/10 p-5 outline outline-1 outline-indigo-500/20">
                            <div className="flex items-start gap-4">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-sm">
                                    1
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-400 mb-1">
                                        {labels.primaryFocus}
                                    </p>
                                    <p className="text-base font-semibold leading-relaxed text-white">
                                        {focusItem}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Steps */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {nextItems.map((item, index) => (
                                <div
                                    key={item}
                                    className="flex items-start gap-3 rounded-xl bg-gray-950/20 p-4 outline outline-1 outline-white/5"
                                >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-white/5 text-[10px] font-bold text-gray-400 outline outline-1 outline-white/10">
                                        {index + 2}
                                    </span>
                                    <p className="text-sm leading-relaxed text-gray-300">
                                        {item}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-400 text-center py-6">{labels.practicePlanEmpty}</p>
                )}
            </div>
        </FeedbackSurface>
    );
}
