"use client";

import type { CvRoleMatchAnalysis } from "@/components/cv/types";

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
    <div className="space-y-2 rounded-[20px] border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        {title}
      </p>

      {items.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-800">
          {items.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Keine Daten</p>
      )}
    </div>
  );
}

export default function CvRoleMatchCard({ analysis }: Props) {
  return (
    <section className="space-y-4 rounded-[24px] border bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Role Match
          </p>
          <p className="mt-1 text-sm text-slate-700">{analysis.summary}</p>
        </div>

        <div className="rounded-full border bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
          {Math.round(analysis.score)}%
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SkillList title="Matched Skills" items={analysis.matched} />
        <SkillList title="Missing Must-Haves" items={analysis.missingMustHave} />
        <SkillList
          title="Nice-to-Have Matches"
          items={analysis.niceToHaveMatches}
        />
        <SkillList title="Bonus Matches" items={analysis.bonusMatches} />
      </div>
    </section>
  );
}
