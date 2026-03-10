"use client"

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
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <header className="mb-6 rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 1</p>
                        <h1 className="text-xl font-semibold">Rolle waehlen</h1>
                    </div>
                </header>

                <section className="rounded-[28px] border bg-white p-6 sm:p-8">
                    <h2 className="text-2xl font-semibold tracking-tight">Waehle die Zielrolle</h2>

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
                        className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                    >
                        Weiter
                    </button>
                </section>
            </div>
        </main>
    )
}
