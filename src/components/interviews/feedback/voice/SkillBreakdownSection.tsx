"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { InterviewFeedbackEvaluation } from "@/lib/interview-feedback-fetch/types";

import { FeedbackSurface, SectionHeading } from "@/components/interviews/feedback/voice/FeedbackSurface";
import { SkillScoreCard } from "@/components/interviews/feedback/voice/SkillScoreCard";

export function SkillBreakdownSection({
    evaluation,
    labels,
    commonLabels,
}: {
    evaluation: InterviewFeedbackEvaluation;
    labels: AppDictionary["interviewFeedback"];
    commonLabels: AppDictionary["common"];
}) {
    return (
        <section className="space-y-4">
            <div className="flex items-end justify-between px-1">
                <SectionHeading
                    title={labels.skillBreakdownTitle}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <SkillScoreCard
                    title={labels.communication}
                    dimension={evaluation.communication}
                    labels={labels}
                    commonLabels={commonLabels}
                />
                <SkillScoreCard
                    title={labels.answerQuality}
                    dimension={evaluation.answerQuality}
                    labels={labels}
                    commonLabels={commonLabels}
                />
                <SkillScoreCard
                    title={labels.roleFit}
                    dimension={evaluation.roleFit}
                    labels={labels}
                    commonLabels={commonLabels}
                />
            </div>
        </section>
    );
}
