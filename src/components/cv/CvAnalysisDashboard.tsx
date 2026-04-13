"use client";

import type { CvQualityAnalysis } from "@/components/cv/types";

type Props = {
  data: CvQualityAnalysis;
};

const metricEntries: Array<
  [keyof Omit<CvQualityAnalysis, "overallScore" | "improvements">, string]
> = [
  ["sections", "Sections"],
  ["impact", "Impact"],
  ["length", "Length"],
  ["contact", "Contact"],
  ["clarity", "Clarity"],
];

function getBarColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function CvAnalysisDashboard({ data }: Props) {
  return (
    <section className="space-y-6 rounded-[24px] border bg-white p-6">
      <div className="space-y-1 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Overall CV Score
        </p>
        <p className="text-5xl font-semibold text-slate-900">
          {Math.round(data.overallScore)}%
        </p>
      </div>

      <div className="space-y-4">
        {metricEntries.map(([key, label]) => {
          const dimension = data[key];

          return (
            <div
              key={key}
              className="space-y-2 rounded-[20px] border bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {label}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {Math.round(dimension.score)}%
                </p>
              </div>

              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className={`h-2 rounded-full ${getBarColor(dimension.score)}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, dimension.score))}%`,
                  }}
                />
              </div>

              <p className="text-sm text-slate-700">{dimension.feedback}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-[20px] border bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Suggested Improvements
        </p>

        {data.improvements.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-800">
            {data.improvements.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-700">Keine Verbesserungen angegeben.</p>
        )}
      </div>
    </section>
  );
}
