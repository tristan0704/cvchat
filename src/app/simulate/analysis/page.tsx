"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

const analysisBullets = [
    "Recruiting-Signal ist derzeit nur vorbereitet.",
    "Interview-Signal wird spaeter aus Chat und Bewertung gebildet.",
    "Coding-Signal wird spaeter aus Challenge und Feedback abgeleitet.",
    "Die finale Panel-Entscheidung bleibt im MVP ein Platzhalter.",
]

function AnalysisPageContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token") ?? ""
    const role = searchParams.get("role") ?? "Backend Developer"
    const outcome = searchParams.get("outcome") ?? "offer"
    const hired = outcome !== "rejected"
    const backHref =
        outcome === "rejected"
            ? `/simulate/screening?${new URLSearchParams({ token, role, screening: "reject" }).toString()}`
            : `/simulate/coding-feedback?${new URLSearchParams({ token, role }).toString()}`

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_45%,#f8fafc_100%)] text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 8</p>
                        <h1 className="text-xl font-semibold">Gesamtanalyse</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link href={backHref} className="rounded-full border px-4 py-2 text-sm">
                            Zurueck
                        </Link>
                        <Link href="/simulate/new" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                            Neue Simulation
                        </Link>
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                    <aside className="rounded-[28px] border bg-[#111827] p-6 text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Kontext</p>
                        <div className="mt-5 space-y-3 text-sm">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-400">Rolle</p>
                                <p className="mt-1">{role}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-400">Panel Decision</p>
                                <p className="mt-1">{hired ? "Offer" : "Reject"}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-400">Simulation Token</p>
                                <p className="mt-1 break-all">{token || "Noch kein Token"}</p>
                            </div>
                        </div>
                    </aside>

                    <div className="rounded-[28px] border bg-white p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Platzhalter</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                            Hiring Panel Entscheidung fuer {role}
                        </h2>
                        <p className="mt-4 text-sm leading-6 text-slate-700">
                            Diese Seite ist aktuell nur der vorbereitete Abschluss des Flows. Spaeter kommen hier
                            Recruiter-Perspektive, Interview-Signal, Coding-Signal und eine nachvollziehbare Entscheidung hinein.
                        </p>

                        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                            <p className="text-sm font-semibold text-slate-900">Vorbereitete Gesamtbewertung</p>
                            <p className="mt-2 text-sm text-slate-700">
                                {hired
                                    ? "Aktueller Platzhalter: Das Hiring Panel wuerde ein Offer aussprechen."
                                    : "Aktueller Platzhalter: Das Hiring Panel wuerde ablehnen."}
                            </p>
                        </div>

                        <div className="mt-6 space-y-3">
                            {analysisBullets.map((bullet) => (
                                <div key={bullet} className="rounded-2xl border px-4 py-3 text-sm text-slate-800">
                                    {bullet}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
            <AnalysisPageContent />
        </Suspense>
    )
}
