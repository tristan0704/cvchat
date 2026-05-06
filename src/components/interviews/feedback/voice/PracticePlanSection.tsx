"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { InterviewFeedbackEvaluation } from "@/lib/interview-feedback-fetch/types";

import {
    FeedbackPanel,
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
        <FeedbackSurface
            variant="highlight"
            className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(17,24,39,0.88),rgba(31,41,55,0.72)),radial-gradient(circle_at_left,rgba(124,58,237,0.18),transparent_36%)]"
        >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />
            <SectionHeading
                eyebrow={labels.practicePlanEyebrow}
                title={labels.practicePlanTitle}
                description={labels.practicePlanDescription}
                badge={<StatusBadge className="bg-violet-500/15 text-violet-100 outline-violet-300/20">{labels.nextRun}</StatusBadge>}
            />

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                {items.length > 0 ? (
                    <>
                        <div className="rounded-xl bg-gray-950/60 p-4 outline outline-1 outline-violet-300/20">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                                {labels.primaryFocus}
                            </p>
                            <p className="mt-2 text-base font-semibold leading-7 text-white">
                                {focusItem}
                            </p>
                        </div>

                        <div className="grid gap-2">
                            {nextItems.length > 0 ? (
                                nextItems.map((item, index) => (
                                    <FeedbackPanel
                                        key={item}
                                        className="flex items-start gap-3 bg-gray-950/45 p-3"
                                    >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-violet-100 outline outline-1 outline-violet-300/20">
                                            {index + 2}
                                        </span>
                                        <p className="min-w-0 text-sm leading-6 text-gray-200">
                                            {item}
                                        </p>
                                    </FeedbackPanel>
                                ))
                            ) : (
                                <FeedbackPanel className="bg-gray-950/45 p-3">
                                    <p className="text-sm leading-6 text-gray-300">
                                        {labels.practicePlanSingleFocus}
                                    </p>
                                </FeedbackPanel>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-400">{labels.practicePlanEmpty}</p>
                )}
            </div>
        </FeedbackSurface>
    );
}
