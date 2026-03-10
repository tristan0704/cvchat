"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function InterviewFeedbackPageContent() {
    const searchParams = useSearchParams()
    const role = searchParams.get("role") ?? "Backend Developer"

    const nextHref = `/simulate/coding?${new URLSearchParams({ role }).toString()}`

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 5</p>
                        <h1 className="text-xl font-semibold">Interview Feedback</h1>
                    </div>
                    <Link href={`/simulate/interview?${new URLSearchParams({ role }).toString()}`} className="rounded-full border px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="rounded-[28px] border bg-white p-6 sm:p-8">
                    <p className="text-sm text-slate-700">{role}</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight">Interview Feedback</h2>

                    <div className="mt-6 space-y-3">
                        <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Kommunikation wird spaeter bewertet.</div>
                        <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Fachliche Tiefe wird spaeter zusammengefasst.</div>
                        <div className="rounded-2xl border px-4 py-3 text-sm text-slate-800">Aktuell geht der Flow einfach weiter.</div>
                    </div>

                    <Link href={nextHref} className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                        Weiter
                    </Link>
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
