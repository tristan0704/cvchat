"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { CvScoreBreakdown } from "@/lib/cv/types";

import {
    CvFeedbackPanel,
    CvFeedbackSurface,
    CvProgressBar,
    CvSectionHeading,
    CvStatusBadge,
    getCvScoreTone,
} from "@/components/cv/feedback/CvFeedbackSurface";

export function CvScoreBreakdownSection({
    breakdown,
    labels,
    commonLabels,
}: {
    breakdown: CvScoreBreakdown;
    labels: AppDictionary["cvFeedback"];
    commonLabels: AppDictionary["common"];
}) {
    const tone = getCvScoreTone(breakdown.blendedScore, commonLabels);

    return (
        <CvFeedbackSurface>
            <CvSectionHeading
                eyebrow={labels.scoreBreakdownEyebrow}
                title={labels.scoreBreakdownTitle}
                description={labels.scoreBreakdownDescription}
                badge={
                    <CvStatusBadge className={tone.badge}>
                        {Math.round(breakdown.blendedScore)}%
                    </CvStatusBadge>
                }
            />

            <div className="mt-6 grid gap-4">
                <ScoreCell
                    label={labels.llmFeedback}
                    weightLabel={labels.weightLabel.replace(
                        "{weight}",
                        String(Math.round(breakdown.llmWeight * 100))
                    )}
                    score={breakdown.llmScore}
                    commonLabels={commonLabels}
                />
                <ScoreCell
                    label={labels.profileMatch}
                    weightLabel={labels.weightLabel.replace(
                        "{weight}",
                        String(Math.round(breakdown.keywordWeight * 100))
                    )}
                    score={breakdown.keywordScore}
                    commonLabels={commonLabels}
                />
            </div>
        </CvFeedbackSurface>
    );
}

function ScoreCell({
    label,
    weightLabel,
    score,
    commonLabels,
}: {
    label: string;
    weightLabel: string;
    score: number;
    commonLabels: AppDictionary["common"];
}) {
    const tone = getCvScoreTone(score, commonLabels);

    return (
        <CvFeedbackPanel className="space-y-3">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">
                        {weightLabel}
                    </p>
                </div>
                <p className="text-lg font-semibold text-white">{Math.round(score)}%</p>
            </div>
            <CvProgressBar value={score} className={tone.bar} />
        </CvFeedbackPanel>
    );
}
