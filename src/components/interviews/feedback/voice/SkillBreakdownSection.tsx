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
        <FeedbackSurface variant="compact" className="bg-gray-800/35">
            <SectionHeading
                eyebrow={labels.skillBreakdownEyebrow}
                title={labels.skillBreakdownTitle}
                description={labels.skillBreakdownDescription}
            />

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
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
        </FeedbackSurface>
    );
}
