"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type SessionUser = {
    id: string
    email: string
    name?: string | null
}

const roles = [
    "Backend Developer",
    "Frontend Developer",
    "Fullstack Developer",
    "Data / AI",
]

const stages = [
    "Rolle waehlen",
    "CV hochladen und Screening sehen",
    "Interview und Coding als vorbereitete Schritte",
    "Finale Analyse als Platzhalter",
]

export default function HomePage() {
    const [user, setUser] = useState<SessionUser | null>(null)

    useEffect(() => {
        async function loadSession() {
            try {
                const res = await fetch("/api/auth/me")
                if (!res.ok) return
                const data = await res.json()
                setUser(data.user ?? null)
            } catch {}
        }

        loadSession()
    }, [])

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#f6f1e8_0%,#f7fafc_45%,#ffffff_100%)] text-slate-900">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <header className="flex items-center justify-between rounded-[28px] border border-black/10 bg-white/80 px-5 py-4 backdrop-blur">
                    <Link href="/home" className="text-lg font-semibold tracking-tight">
                        CareerPitch
                    </Link>
                    <div className="flex items-center gap-2">
                        {!user ? (
                            <>
                                <Link href="/auth?mode=login" className="rounded-full border border-black/10 px-4 py-2 text-sm">
                                    Login
                                </Link>
                                <Link
                                    href="/auth?mode=register"
                                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                                >
                                    Registrieren
                                </Link>
                            </>
                        ) : (
                            <Link
                                href="/simulate/new"
                                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                            >
                                Simulation starten
                            </Link>
                        )}
                    </div>
                </header>

                <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[32px] border border-black/10 bg-white p-7 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">MVP Hiring Flow</p>
                        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                            Ein einfacher Hiring-Flow als Vorbereitung fuer spaetere Logik.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base text-slate-700 sm:text-lg">
                            Der aktuelle Stand ist bewusst schlicht: Rolle waehlen, CV hochladen, Interview-Chat durchlaufen,
                            Platzhalter-Feedback sehen und am Ende eine vorbereitete Gesamtanalyse bekommen.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href="/simulate/new" className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950">
                                Neue Simulation
                            </Link>
                            {!user && (
                                <Link href="/auth?mode=register" className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold">
                                    Account anlegen
                                </Link>
                            )}
                        </div>
                    </div>

                    <aside className="rounded-[32px] border border-black/10 bg-[#111827] p-7 text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Rollen</p>
                        <div className="mt-5 space-y-3">
                            {roles.map((role) => (
                                <div key={role} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                                    {role}
                                </div>
                            ))}
                        </div>
                    </aside>
                </section>

                <section className="mt-6 grid gap-4 md:grid-cols-4">
                    {stages.map((stage, index) => (
                        <article key={stage} className="rounded-[24px] border border-black/10 bg-white px-5 py-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step {index + 1}</p>
                            <p className="mt-3 text-sm text-slate-800">{stage}</p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    )
}
