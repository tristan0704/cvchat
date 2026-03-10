"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

const roles = [
    "Backend Developer",
    "Frontend Developer",
    "Fullstack Developer",
    "Data / AI",
]

const inputClass =
    "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"

export default function NewSimulationPage() {
    const router = useRouter()
    const cvInputRef = useRef<HTMLInputElement | null>(null)

    const [selectedRole, setSelectedRole] = useState(roles[0])
    const [company, setCompany] = useState("")
    const [githubUrl, setGithubUrl] = useState("")
    const [cvFile, setCvFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleStart() {
        if (!cvFile) {
            setError("Bitte zuerst ein CV-PDF auswaehlen.")
            return
        }

        setLoading(true)
        setError("")

        const formData = new FormData()
        formData.append("cv", cvFile)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Upload fehlgeschlagen.")
                return
            }

            const params = new URLSearchParams({
                token: data.token,
                role: selectedRole,
            })

            if (company.trim()) params.set("company", company.trim())
            if (githubUrl.trim()) params.set("github", githubUrl.trim())

            router.push(`/simulate/interview?${params.toString()}`)
        } catch {
            setError("Server nicht erreichbar.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 1</p>
                        <h1 className="text-xl font-semibold">Simulation Setup</h1>
                    </div>
                    <Link href="/home" className="rounded-full border px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[28px] border bg-white p-6 sm:p-8">
                        <h2 className="text-2xl font-semibold tracking-tight">CV Upload fuer eine konkrete Rolle</h2>
                        <p className="mt-2 text-sm text-slate-700">
                            Fuer den groben MVP sammeln wir nur das Noetigste: Zielrolle, CV und etwas Kontext fuer die folgende Interview-Simulation.
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

                        <div className="mt-6 space-y-4">
                            <input
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="Firma optional, z. B. Dynatrace"
                                className={inputClass}
                            />

                            <input
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                placeholder="GitHub Profil oder Repo optional"
                                className={inputClass}
                            />

                            <input
                                ref={cvInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => cvInputRef.current?.click()}
                                className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-left text-sm"
                            >
                                {cvFile ? `CV: ${cvFile.name}` : "CV PDF auswaehlen"}
                            </button>
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {loading ? "Verarbeite..." : "Weiter zum Interview"}
                        </button>

                        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                    </div>

                    <aside className="rounded-[28px] border bg-[#fff7ed] p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Flow</p>
                        <ol className="mt-5 space-y-4 text-sm text-slate-800">
                            <li className="rounded-2xl border border-amber-200 bg-white px-4 py-3">1. CV Upload und Rollenwahl</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">2. Interview mit GPT Wrapper</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">3. Leere Coding Challenge Seite</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">4. Finale Analyse als Template</li>
                        </ol>
                    </aside>
                </section>
            </div>
        </main>
    )
}
