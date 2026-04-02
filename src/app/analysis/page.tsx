"use client"

import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import CvAnalysisDashboard from "@/components/CvAnalysisDashboard"
import { CvQualityAI } from "@/lib/cv-analysis/analyzeCvQualityWithLLM"

type RoleSuggestion = {
    role: string
    score: number
    matched: string[]
    missing: string[]
    summary: string
}

type AnalysisApiResponse = {
    roles: RoleSuggestion[]
    quality: CvQualityAI
}

const MAX_FILE_BYTES = 20_000_000
const steps = [
    "Analysiere Sections...",
    "Analysiere Impact...",
    "Analysiere Length...",
    "Analysiere Contact...",
    "Analysiere Clarity...",
    "Berechne Overall Score...",
]

export default function AnalysisPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [result, setResult] = useState<AnalysisApiResponse | null>(null)
    const [stepIndex, setStepIndex] = useState(0)
    const [showResult, setShowResult] = useState(true)

    useEffect(() => {
        if (!loading) {
            return
        }

        let index = 0
        setStepIndex(0)
        const interval = setInterval(() => {
            index = (index + 1) % steps.length
            setStepIndex(index)
        }, 600)

        return () => clearInterval(interval)
    }, [loading])

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files?.[0] ?? null

        if (!selected) {
            setFile(null)
            return
        }

        if (selected.type !== "application/pdf") {
            setError("Please upload a PDF")
            setFile(null)
            return
        }

        if (selected.size > MAX_FILE_BYTES) {
            setError("File too large")
            setFile(null)
            return
        }

        setError("")
        setFile(selected)
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!file) {
            setError("Please upload a PDF")
            return
        }

        setError("")
        setLoading(true)
        setResult(null)
        setShowResult(false)
        const startTime = Date.now()

        const formData = new FormData()
        formData.append("file", file)

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                body: formData,
            })

            const data = await response.json()
            if (!response.ok || !Array.isArray(data?.roles) || !data?.quality) {
                throw new Error("Analysis failed")
            }

            const elapsed = Date.now() - startTime
            const minDuration = 3000
            if (elapsed < minDuration) {
                await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed))
            }

            setStepIndex(steps.length - 1)
            await new Promise((resolve) => setTimeout(resolve, 600))

            setResult({ roles: data.roles, quality: data.quality })
            setShowResult(true)
        } catch (err) {
            setError("Analysis failed")
            setShowResult(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 py-12">
            <div className="relative mx-auto max-w-2xl space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow">
                {(loading || !showResult) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/80">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-dashed border-slate-300 border-t-slate-900" />
                            <p className="text-sm text-slate-600 animate-pulse transition-opacity">
                                {steps[stepIndex]}
                            </p>
                        </div>
                    </div>
                )}
                <header>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">CV Analyse</p>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-900">CV gegen passende Rollen evaluieren</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Lade ein PDF hoch und wir schlagen dir bis zu drei passende Rollen vor.
                    </p>
                </header>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700" htmlFor="file">
                            CV (PDF)
                        </label>
                        <input
                            id="file"
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        {loading ? "Analysiere..." : "Analyse starten"}
                    </button>
                </form>

                {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

                {result?.quality ? (
                    <CvAnalysisDashboard data={result.quality} />
                ) : (
                    <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
                        Keine Qualitätsdaten verfügbar.
                    </div>
                )}

                {result && result.roles.length > 0 && (
                    <section className="space-y-6">
                        <p className="text-sm text-slate-500">
                            Die vorgeschlagenen Rollen und Scores sind Empfehlungen – nutze sie als Orientierung, nicht als endgültige Bewertung.
                        </p>
                        <div className="grid gap-6">
                            {result.roles.map((roleSuggestion) => (
                                <RoleCard key={roleSuggestion.role} suggestion={roleSuggestion} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    )
}

function RoleCard({ suggestion }: { suggestion: RoleSuggestion }) {
    return (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{suggestion.role}</h2>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                    {Math.round(suggestion.score)}
                </span>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
                <SkillList title="Matched Skills" items={suggestion.matched} />
                <SkillList title="Missing Skills" items={suggestion.missing} />
            </div>
            <p className="text-sm text-slate-800">{suggestion.summary || "Keine weiteren Details verfügbar."}</p>
        </div>
    )
}

function SkillList({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{title}</p>
            <ul className="space-y-1">
                {items.length ? (
                    items.map((item) => (
                        <li key={item} className="truncate">
                            {item}
                        </li>
                    ))
                ) : (
                    <li className="text-slate-500">Keine Daten</li>
                )}
            </ul>
        </div>
    )
}
