"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { CvQualityAnalysis } from "@/lib/cv/types";

import {
    CvFeedbackPanel,
    CvFeedbackSurface,
    CvProgressBar,
    CvSectionHeading,
    getCvScoreTone,
} from "@/components/cv/feedback/CvFeedbackSurface";

const metricKeys: Array<keyof Omit<CvQualityAnalysis, "overallScore" | "improvements">> = [
    "sections",
    "impact",
    "length",
    "contact",
    "clarity",
];

export function CvQualitySection({
    quality,
    labels,
    commonLabels,
}: {
    quality: CvQualityAnalysis;
    labels: AppDictionary["cvFeedback"];
    commonLabels: AppDictionary["common"];
}) {
    return (
        <CvFeedbackSurface>
            <CvSectionHeading
                eyebrow={labels.qualityEyebrow}
                title={labels.qualityTitle}
                description={labels.qualityDescription}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                {metricKeys.map((key) => {
                    const dimension = quality[key];
                    const tone = getCvScoreTone(dimension.score, commonLabels);

                    return (
                        <CvFeedbackPanel key={key} className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        {labels.metrics[key]}
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">
                                        {tone.label}
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-white">
                                    {Math.round(dimension.score)}%
                                </p>
                            </div>

                            <CvProgressBar value={dimension.score} className={tone.bar} />

                            <p className="text-sm leading-relaxed text-gray-300">
                                {dimension.feedback}
                            </p>
                        </CvFeedbackPanel>
                    );
                })}
            </div>
        </CvFeedbackSurface>
    );
}
