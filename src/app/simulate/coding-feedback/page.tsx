"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function CodingFeedbackPageContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token") ?? ""
    const role = searchParams.get("role") ?? "Backend Developer"

    const nextHref = `/simulate/analysis?${new URLSearchParams({ token, role, outcome: "offer" }).toString()}`

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 7</p>
                        <h1 className="text-xl font-semibold">Coding Feedback</h1>
                    </div>
                    <Link href={`/simulate/coding?${new URLSearchParams({ token, role }).toString()}`} className="rounded-full border px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-[28px] border bg-[#fff7ed] p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Platzhalter</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Vorbereitetes Coding-Fazit</h2>
                        <p className="mt-4 text-sm leading-6 text-slate-700">
                            Hier kommt spaeter die technische Bewertung hinein. Aktuell ist diese Seite nur ein
                            vorbereiteter Block fuer spaetere Auswertung.
                        </p>
                    </div>

                    <div className="rounded-[28px] border bg-white p-6 sm:p-8">
                        <div className="space-y-3">
                            <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Problemverstaendnis wird spaeter bewertet.</div>
                            <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Code-Qualitaet und Edge Cases folgen spaeter.</div>
                            <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Das Ergebnis wird spaeter in die Gesamtanalyse uebernommen.</div>
                        </div>

                        <Link href={nextHref} className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                            Weiter zur Gesamtanalyse
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default function CodingFeedbackPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
            <CodingFeedbackPageContent />
        </Suspense>
    )
}
