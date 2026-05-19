"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

import {
    CvFeedbackPanel,
    CvFeedbackSurface,
    CvSectionHeading,
} from "@/components/cv/feedback/CvFeedbackSurface";

export function CvImprovementPlanSection({
    improvements,
    labels,
}: {
    improvements: string[];
    labels: AppDictionary["cvFeedback"];
}) {
    return (
        <CvFeedbackSurface>
            <CvSectionHeading
                eyebrow={labels.improvementEyebrow}
                title={labels.improvementTitle}
                description={labels.improvementDescription}
            />

            <div className="mt-6 space-y-3">
                {improvements.length > 0 ? (
                    improvements.map((item, index) => (
                        <CvFeedbackPanel
                            key={`${index}-${item}`}
                            className="flex gap-4"
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-200 outline outline-1 outline-indigo-300/20">
                                {index + 1}
                            </div>
                            <p className="text-sm leading-relaxed text-gray-200">
                                {item}
                            </p>
                        </CvFeedbackPanel>
                    ))
                ) : (
                    <CvFeedbackPanel>
                        <p className="text-sm text-gray-400">{labels.noImprovements}</p>
                    </CvFeedbackPanel>
                )}
            </div>
        </CvFeedbackSurface>
    );
}
