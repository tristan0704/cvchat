"use client"

import { CvQualityAI } from "@/lib/cv-analysis/analyzeCvQualityWithLLM"

type Props = {
    data: CvQualityAI
}

const getColor = (score: number) => {
    if (score >= 75) return "bg-green-500"
    if (score >= 50) return "bg-yellow-500"
    return "bg-red-500"
}

const metricEntries: Array<[keyof Omit<CvQualityAI, "overallScore" | "improvements">, string]> = [
    ["sections", "Sections"],
    ["impact", "Impact"],
    ["length", "Length"],
    ["contact", "Contact"],
    ["clarity", "Clarity"],
]

export default function CvAnalysisDashboard({ data }: Props) {
    if (!data) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
                CV analysis unavailable.
            </div>
        )
    }

    return (
        <section className="mx-auto max-w-3xl space-y-6 rounded-2xl bg-white p-6 shadow">
            <div className="space-y-1 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Overall CV Score</p>
                <p className="text-5xl font-semibold text-slate-900">{Math.round(data.overallScore)}%</p>
            </div>

            <div className="space-y-4">
                {metricEntries.map(([key, label]) => {
                    const dimension = data[key]
                    return (
                        <div key={key} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    {label}
                                </p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {Math.round(dimension.score)}%
                                </p>
                            </div>
                            <div className="h-2 rounded-full bg-gray-200">
                                <div
                                    className={`h-2 rounded-full ${getColor(dimension.score)}`}
                                    style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
                                />
                            </div>
                            <p className="text-sm text-slate-700">{dimension.feedback}</p>
                        </div>
                    )
                })}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Suggested Improvements</p>
                {data.improvements.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-slate-800">
                        {data.improvements.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-700">Keine Verbesserungen angegeben.</p>
                )}
            </div>
        </section>
    )
}
