"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { CvRoleMatchAnalysis } from "@/lib/cv/types";

import {
    CvFeedbackPanel,
    CvFeedbackSurface,
    CvProgressBar,
    CvSectionHeading,
    CvStatusBadge,
    getCvScoreTone,
} from "@/components/cv/feedback/CvFeedbackSurface";

export function CvRoleFitSection({
    analysis,
    labels,
    commonLabels,
}: {
    analysis: CvRoleMatchAnalysis;
    labels: AppDictionary["cvFeedback"];
    commonLabels: AppDictionary["common"];
}) {
    const tone = getCvScoreTone(analysis.score, commonLabels);

    return (
        <CvFeedbackSurface>
            <CvSectionHeading
                eyebrow={labels.roleFitEyebrow}
                title={labels.roleFit}
                description={analysis.summary}
                badge={
                    <CvStatusBadge className={tone.badge}>
                        {Math.round(analysis.score)}%
                    </CvStatusBadge>
                }
            />

            <div className="mt-5">
                <CvProgressBar value={analysis.score} className={tone.bar} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <SkillList
                    title={labels.matchingSkills}
                    items={analysis.matched}
                    emptyLabel={labels.noData}
                />
                <SkillList
                    title={labels.missingMustHave}
                    items={analysis.missingMustHave}
                    emptyLabel={labels.noData}
                />
                <SkillList
                    title={labels.additionalSignals}
                    items={analysis.niceToHaveMatches}
                    emptyLabel={labels.noData}
                />
                <SkillList
                    title={labels.bonusMatches}
                    items={analysis.bonusMatches}
                    emptyLabel={labels.noData}
                />
            </div>
        </CvFeedbackSurface>
    );
}

function SkillList({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: string[];
    emptyLabel: string;
}) {
    return (
        <CvFeedbackPanel>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {title}
            </p>

            {items.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-gray-200">
                    {items.map((item) => (
                        <li key={item} className="rounded-lg bg-white/5 px-3 py-2">
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-sm text-gray-500">{emptyLabel}</p>
            )}
        </CvFeedbackPanel>
    );
}
