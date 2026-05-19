"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";

import { CvFeedbackSummaryHero } from "@/components/cv/feedback/CvFeedbackSummaryHero";
import { CvImprovementPlanSection } from "@/components/cv/feedback/CvImprovementPlanSection";
import { CvQualitySection } from "@/components/cv/feedback/CvQualitySection";
import { CvRoleFitSection } from "@/components/cv/feedback/CvRoleFitSection";
import { CvScoreBreakdownSection } from "@/components/cv/feedback/CvScoreBreakdownSection";

export function CvFeedbackReport({
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
    return (
        <div className="space-y-6">
            <CvFeedbackSummaryHero
                result={result}
                config={config}
                labels={labels}
                commonLabels={commonLabels}
            />

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <CvQualitySection
                        quality={result.quality}
                        labels={labels}
                        commonLabels={commonLabels}
                    />
                    <CvRoleFitSection
                        analysis={result.roleAnalysis}
                        labels={labels}
                        commonLabels={commonLabels}
                    />
                </div>

                <div className="space-y-6">
                    <CvScoreBreakdownSection
                        breakdown={result.scoreBreakdown}
                        labels={labels}
                        commonLabels={commonLabels}
                    />
                    <CvImprovementPlanSection
                        improvements={result.quality.improvements}
                        labels={labels}
                    />
                </div>
            </div>
        </div>
    );
}
