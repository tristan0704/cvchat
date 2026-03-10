"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function ScreeningPageContent() {
    const searchParams = useSearchParams()
    const role = searchParams.get("role") ?? "Backend Developer"
    const screening = searchParams.get("screening") ?? "passed"
    const passed = screening !== "reject"

    const nextHref = passed
        ? `/simulate/interview?${new URLSearchParams({ role }).toString()}`
        : `/simulate/analysis?${new URLSearchParams({ role, outcome: "rejected" }).toString()}`

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 3</p>
                        <h1 className="text-xl font-semibold">Screening</h1>
                    </div>
                    <Link href={`/upload?${new URLSearchParams({ role }).toString()}`} className="rounded-full border border-white/15 px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className={`rounded-[28px] border p-6 sm:p-8 ${passed ? "border-emerald-400/30 bg-emerald-500/10" : "border-rose-400/30 bg-rose-500/10"}`}>
                    <p className="text-sm text-slate-300">{role}</p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight">{passed ? "Passed" : "Reject"}</h2>
                    <p className="mt-4 text-sm text-slate-300">
                        {passed
                            ? "Platzhalter-Ergebnis. Der Flow geht weiter ins Interview."
                            : "Platzhalter-Ergebnis. Der Flow springt direkt zur Gesamtanalyse."}
                    </p>

                    <Link href={nextHref} className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                        Weiter
                    </Link>
                </section>
            </div>
        </main>
    )
}

export default function ScreeningPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
            <ScreeningPageContent />
        </Suspense>
    )
}
