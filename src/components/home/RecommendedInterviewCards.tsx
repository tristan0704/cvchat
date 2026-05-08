import type { AppDictionary } from "@/lib/i18n/dictionaries";

import { QuickStartInterviewCard } from "@/components/home/QuickStartInterviewCard";

type RecommendedInterviewCardsProps = {
    labels: AppDictionary["home"];
};

const RECOMMENDED_INTERVIEWS = [
    {
        key: "frontend",
        templateId: "frontend-mid-mittelstand",
    },
    {
        key: "backend",
        templateId: "backend-mid-mittelstand",
    },
    {
        key: "fullstack",
        templateId: "fullstack-mid-mittelstand",
    },
] as const;

export function RecommendedInterviewCards({
    labels,
}: RecommendedInterviewCardsProps) {
    return (
        <section className="mt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {labels.recommendedEyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                        {labels.recommendedTitle}
                    </h2>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-gray-400">
                    {labels.recommendedDescription}
                </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {RECOMMENDED_INTERVIEWS.map((item) => {
                    const card = labels.recommendedCards[item.key];

                    return (
                        <QuickStartInterviewCard
                            key={item.key}
                            createErrorLabel={labels.quickStartError}
                            creatingLabel={labels.quickStartCreating}
                            ctaLabel={labels.quickStartCta}
                            focusItems={[...card.focusItems]}
                            roleLabel={card.roleLabel}
                            summary={card.summary}
                            templateId={item.templateId}
                            title={card.title}
                        />
                    );
                })}
            </div>
        </section>
    );
}
