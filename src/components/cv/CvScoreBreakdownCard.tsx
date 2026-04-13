"use client";

import type { CvScoreBreakdown } from "@/components/cv/types";

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
    <div className="rounded-[20px] border bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xs text-slate-500">{weightLabel}</p>
        </div>

        <p className="text-lg font-semibold text-slate-900">
          {Math.round(score)}%
        </p>
      </div>
    </div>
  );
}

export default function CvScoreBreakdownCard({ breakdown }: Props) {
  return (
    <section className="space-y-4 rounded-[24px] border bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Score Breakdown
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Gesamtwertung aus GPT-Analyse und Keyword-Match.
          </p>
        </div>

        <div className="rounded-full border bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {Math.round(breakdown.blendedScore)}%
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreRow
          label="GPT Feedback"
          weightLabel={`${Math.round(breakdown.llmWeight * 100)}% Gewichtung`}
          score={breakdown.llmScore}
        />
        <ScoreRow
          label="Keyword Match"
          weightLabel={`${Math.round(breakdown.keywordWeight * 100)}% Gewichtung`}
          score={breakdown.keywordScore}
        />
      </div>
    </section>
  );
}
