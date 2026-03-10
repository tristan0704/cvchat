"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function ScreeningPageContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token") ?? ""
    const role = searchParams.get("role") ?? "Backend Developer"
    const screening = searchParams.get("screening") ?? "passed"
    const passed = screening !== "reject"

    const nextHref = passed
        ? `/simulate/interview?${new URLSearchParams({ token, role }).toString()}`
        : `/simulate/analysis?${new URLSearchParams({ token, role, outcome: "rejected" }).toString()}`

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 3</p>
                        <h1 className="text-xl font-semibold">Screening</h1>
                    </div>
                    <Link href={`/upload?${new URLSearchParams({ role }).toString()}`} className="rounded-full border border-white/15 px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className={`rounded-[28px] border p-6 sm:p-8 ${passed ? "border-emerald-400/30 bg-emerald-500/10" : "border-rose-400/30 bg-rose-500/10"}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Platzhalter</p>
                        <h2 className="mt-3 text-4xl font-semibold tracking-tight">{passed ? "Passed" : "Reject"}</h2>
                        <p className="mt-4 max-w-2xl text-sm text-slate-300">
                            Dieses Ergebnis ist derzeit nur ein vorbereiteter Platzhalter fuer ein spaeteres CV-Screening
                            fuer die Rolle {role}.
                        </p>

                        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-200">
                            {passed
                                ? "Aktueller MVP-Pfad: weiter ins Interview. Begruendung und Score folgen spaeter."
                                : "Aktueller MVP-Pfad: direkt in die finale Analyse. Begruendung und Score folgen spaeter."}
                        </div>

                        <Link href={nextHref} className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                            {passed ? "Weiter zum Interview" : "Weiter zur finalen Analyse"}
                        </Link>
                    </div>

                    <aside className="rounded-[28px] border border-white/10 bg-white/5 p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Kontext</p>
                        <div className="mt-5 space-y-3 text-sm text-slate-300">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Rolle</p>
                                <p className="mt-1 text-slate-100">{role}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Simulation Token</p>
                                <p className="mt-1 break-all text-slate-100">{token || "Noch kein Token"}</p>
                            </div>
                        </div>
                    </aside>
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
