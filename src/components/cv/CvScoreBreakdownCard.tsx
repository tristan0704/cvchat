"use client";

import type { CvScoreBreakdown } from "@/lib/cv/types";

type Props = {
  breakdown: CvScoreBreakdown;
};

function ScoreRow({
  label,
  weightLabel,
  score,
}: {
  label: string;
  weightLabel: string;
  score: number;
}) {
  return (
    <div className="rounded-xl bg-gray-900 p-4 outline outline-1 outline-white/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            {label}
          </p>
          <p className="mt-1 text-xs text-gray-500">{weightLabel}</p>
        </div>

        <p className="text-lg font-semibold text-white">
          {Math.round(score)}%
        </p>
      </div>
    </div>
  );
}

export default function CvScoreBreakdownCard({ breakdown }: Props) {
  return (
    <section className="space-y-4 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            Score-Aufteilung
          </p>
          <p className="mt-1 text-sm text-gray-300">
            Gesamtwertung aus GPT-Analyse und Profilabgleich.
          </p>
        </div>

        <div className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white outline outline-1 outline-white/10">
          {Math.round(breakdown.blendedScore)}%
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreRow
          label="GPT-Feedback"
          weightLabel={`${Math.round(breakdown.llmWeight * 100)}% Gewichtung`}
          score={breakdown.llmScore}
        />
        <ScoreRow
          label="Profilabgleich"
          weightLabel={`${Math.round(breakdown.keywordWeight * 100)}% Gewichtung`}
          score={breakdown.keywordScore}
        />
      </div>
    </section>
  );
}
