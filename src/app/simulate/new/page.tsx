"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

const roles = [
    "Backend Developer",
    "Frontend Developer",
    "Fullstack Developer",
    "Data / AI",
]

export default function NewSimulationPage() {
    const router = useRouter()
    const [selectedRole, setSelectedRole] = useState(roles[0])

    function handleStart() {
        router.push(`/upload?${new URLSearchParams({ role: selectedRole }).toString()}`)
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 1</p>
                        <h1 className="text-xl font-semibold">Rolle waehlen</h1>
                    </div>
                    <Link href="/home" className="rounded-full border px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[28px] border bg-white p-6 sm:p-8">
                        <h2 className="text-2xl font-semibold tracking-tight">Waehle die Zielrolle fuer deine Simulation</h2>
                        <p className="mt-2 text-sm text-slate-700">
                            Der Flow startet jetzt bewusst maximal schlank: zuerst nur die Zielrolle, danach kommt der CV-Upload als eigener Schritt.
                        </p>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {roles.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setSelectedRole(role)}
                                    className={`rounded-2xl border px-4 py-4 text-left text-sm ${
                                        selectedRole === role
                                            ? "border-slate-900 bg-slate-900 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-900"
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleStart}
                            className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            Weiter zum CV Upload
                        </button>
                    </div>

                    <aside className="rounded-[28px] border bg-[#fff7ed] p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Flow</p>
                        <ol className="mt-5 space-y-4 text-sm text-slate-800">
                            <li className="rounded-2xl border border-amber-200 bg-white px-4 py-3">1. Rolle waehlen</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">2. CV Upload und Screening</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">3. Interview, Feedback, Coding, Feedback</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">4. Finale Hiring-Entscheidung</li>
                        </ol>
                    </aside>
                </section>
            </div>
        </main>
    )
}
