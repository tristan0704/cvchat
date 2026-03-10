"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function InterviewFeedbackPageContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token") ?? ""
    const role = searchParams.get("role") ?? "Backend Developer"

    const nextHref = `/simulate/coding?${new URLSearchParams({ token, role }).toString()}`

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 5</p>
                        <h1 className="text-xl font-semibold">Interview Feedback</h1>
                    </div>
                    <Link href={`/simulate/interview?${new URLSearchParams({ token, role }).toString()}`} className="rounded-full border px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <aside className="rounded-[28px] border bg-[#111827] p-6 text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Kontext</p>
                        <div className="mt-5 space-y-3 text-sm">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-400">Rolle</p>
                                <p className="mt-1">{role}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                                <p className="mt-1">Platzhalter: weiter zum Coding</p>
                            </div>
                        </div>
                    </aside>

                    <div className="rounded-[28px] border bg-white p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Platzhalter</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Vorbereitetes Interview-Fazit</h2>
                        <p className="mt-4 text-sm leading-6 text-slate-700">
                            Hier kommt spaeter das strukturierte Interview-Feedback hinein. Aktuell ist diese Seite nur
                            ein Platzhalter fuer den kuenftigen Bewertungsblock.
                        </p>

                        <div className="mt-6 space-y-3">
                            <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Kommunikation wird spaeter bewertet.</div>
                            <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Fachliche Tiefe wird spaeter strukturiert zusammengefasst.</div>
                            <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Der aktuelle MVP leitet hier nur weiter zum naechsten Schritt.</div>
                        </div>

                        <Link href={nextHref} className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                            Weiter zur Coding Challenge
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default function InterviewFeedbackPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
            <InterviewFeedbackPageContent />
        </Suspense>
    )
}
