"use client"

import { ChangeEvent, FormEvent, useState } from "react"

type AnalysisResult = {
    score: number
    matched: string[]
    missing_must_have: string[]
    nice_to_have_matches: string[]
    bonus_matches: string[]
    summary: string
}

const jobRoles = ["Backend Developer", "Data Scientist", "Generalist"]
const MAX_FILE_BYTES = 20_000_000

export default function AnalysisPage() {
    const [role, setRole] = useState(jobRoles[0])
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [result, setResult] = useState<AnalysisResult | null>(null)

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

        const formData = new FormData()
        formData.append("file", file)
        formData.append("role", role)

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                body: formData,
            })

            const data = await response.json()
            if (!response.ok || !data?.analysis) {
                throw new Error("Analysis failed")
            }

            setResult(data.analysis)
        } catch (err) {
            if (err instanceof Error && err.message === "Analysis failed") {
                setError("Analysis failed")
            } else {
                setError("Analysis failed")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 py-12">
            <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow">
                <header>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">CV Analyse</p>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-900">CV gegen Profil evaluieren</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Lade ein PDF hoch, wähle eine Rolle und erhalte eine schnelle Bewertung.
                    </p>
                </header>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700" htmlFor="role">
                            Rolle
                        </label>
                        <select
                            id="role"
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                        >
                            {jobRoles.map((roleOption) => (
                                <option key={roleOption}>{roleOption}</option>
                            ))}
                        </select>
                    </div>

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

                {result && (
                    <section className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Score</p>
                            <p className="text-5xl font-semibold text-slate-900">{Math.round(result.score)}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <ResultCard title="Matched Skills" items={result.matched} />
                            <ResultCard title="Fehlende Must-haves" items={result.missing_must_have} />
                            <ResultCard title="Nice-to-have" items={result.nice_to_have_matches} />
                            <ResultCard title="Bonus" items={result.bonus_matches} />
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6">
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Zusammenfassung</p>
                            <p className="mt-2 text-sm text-slate-800">{result.summary}</p>
                        </div>
                    </section>
                )}
            </div>
        </main>
    )
}

function ResultCard({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-800">
                {items.length
                    ? items.map((item) => (
                          <li key={item} className="truncate">
                              {item}
                          </li>
                      ))
                    : <li className="text-slate-400">Keine Einträge</li>}
            </ul>
        </div>
    )
}
