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
    const role = searchParams.get("role") ?? "Backend Developer"
    const outcome = searchParams.get("outcome") ?? "offer"
    const hired = outcome !== "rejected"
    const backHref =
        outcome === "rejected"
            ? `/simulate/screening?${new URLSearchParams({ role, screening: "reject" }).toString()}`
            : `/simulate/coding-feedback?${new URLSearchParams({ role }).toString()}`

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

                <section className="rounded-[28px] border bg-white p-6 sm:p-8">
                    <p className="text-sm text-slate-700">{role}</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight">{hired ? "Offer" : "Reject"}</h2>

                    <div className="mt-6 space-y-3">
                        {analysisBullets.map((bullet) => (
                            <div key={bullet} className="rounded-2xl border px-4 py-3 text-sm text-slate-800">
                                {bullet}
                            </div>
                        ))}
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
