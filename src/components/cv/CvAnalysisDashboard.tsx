"use client";

import type { CvQualityAnalysis } from "@/lib/cv/types";

type Props = {
  data: CvQualityAnalysis;
};

const metricEntries: Array<
  [keyof Omit<CvQualityAnalysis, "overallScore" | "improvements">, string]
> = [
  ["sections", "Abschnitte"],
  ["impact", "Wirkung"],
  ["length", "Länge"],
  ["contact", "Kontakt"],
  ["clarity", "Klarheit"],
];

function getBarColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function CvAnalysisDashboard({ data }: Props) {
  return (
    <section className="space-y-6 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
      <div className="space-y-1 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
          Gesamtbewertung
        </p>
        <p className="text-5xl font-semibold text-white">
          {Math.round(data.overallScore)}%
        </p>
      </div>

      <div className="space-y-4">
        {metricEntries.map(([key, label]) => {
          const dimension = data[key];

          return (
            <div
              key={key}
              className="space-y-2 rounded-xl bg-gray-900 p-4 outline outline-1 outline-white/10"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {label}
                </p>
                <p className="text-sm font-semibold text-white">
                  {Math.round(dimension.score)}%
                </p>
              </div>

              <div className="h-2 rounded-full bg-gray-800">
                <div
                  className={`h-2 rounded-full ${getBarColor(dimension.score)}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, dimension.score))}%`,
                  }}
                />
              </div>

              <p className="text-sm text-gray-300">{dimension.feedback}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-xl bg-gray-900 p-4 outline outline-1 outline-white/10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
          Verbesserungen
        </p>

        {data.improvements.length > 0 ? (
          <ul className="space-y-2 text-sm text-gray-200">
            {data.improvements.map((item) => (
              <li key={item} className="rounded-lg bg-white/5 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">Keine Verbesserungen angegeben.</p>
        )}
      </div>
    </section>
  );
}
