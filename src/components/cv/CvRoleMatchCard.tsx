"use client";

import type { CvRoleMatchAnalysis } from "@/lib/cv/types";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  analysis: CvRoleMatchAnalysis;
};

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
    <div className="space-y-2 rounded-xl bg-gray-900 p-4 outline outline-1 outline-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
        {title}
      </p>

      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-gray-200">
          {items.map((item) => (
            <li key={item} className="rounded-lg bg-white/5 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      )}
    </div>
  );
}

export default function CvRoleMatchCard({ analysis }: Props) {
  const { dictionary } = useI18n();
  const labels = dictionary.cvFeedback;

  return (
    <section className="space-y-4 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            {labels.roleFit}
          </p>
          <p className="mt-1 text-sm text-gray-300">{analysis.summary}</p>
        </div>

        <div className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white outline outline-1 outline-white/10">
          {Math.round(analysis.score)}%
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
    </section>
  );
}
