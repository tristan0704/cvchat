"use client";

import type { CvRoleMatchAnalysis } from "@/lib/cv/types";

type Props = {
  analysis: CvRoleMatchAnalysis;
};

function SkillList({
  title,
  items,
}: {
  title: string;
  items: string[];
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
        <p className="text-sm text-gray-500">Keine Daten</p>
      )}
    </div>
  );
}

export default function CvRoleMatchCard({ analysis }: Props) {
  return (
    <section className="space-y-4 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            Rollenfit
          </p>
          <p className="mt-1 text-sm text-gray-300">{analysis.summary}</p>
        </div>

        <div className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white outline outline-1 outline-white/10">
          {Math.round(analysis.score)}%
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SkillList title="Passende Skills" items={analysis.matched} />
        <SkillList title="Fehlende Muss-Kriterien" items={analysis.missingMustHave} />
        <SkillList
          title="Zusätzliche passende Signale"
          items={analysis.niceToHaveMatches}
        />
        <SkillList title="Bonus-Treffer" items={analysis.bonusMatches} />
      </div>
    </section>
  );
}
