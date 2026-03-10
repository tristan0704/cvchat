"use client"

import Link from "next/link"
import { Suspense, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function UploadPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const role = searchParams.get("role") ?? "Backend Developer"
    const cvInputRef = useRef<HTMLInputElement | null>(null)

    const [cvFile, setCvFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleUpload() {
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

            const screening = role === "Data / AI" ? "reject" : "passed"
            const params = new URLSearchParams({
                token: data.token,
                role,
                screening,
            })

            router.push(`/simulate/screening?${params.toString()}`)
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
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 2</p>
                        <h1 className="text-xl font-semibold">CV Upload</h1>
                    </div>
                    <Link href="/simulate/new" className="rounded-full border px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[28px] border bg-white p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Rolle</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight">{role}</h2>
                        <p className="mt-4 max-w-2xl text-sm text-slate-700">
                            Dieser Schritt ist aktuell reine Vorbereitung: CV hochladen, Parsing pruefen und danach ein
                            einfaches Screening-Ergebnis als Platzhalter anzeigen.
                        </p>

                        <div className="mt-8">
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
                                className="w-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-left text-sm"
                            >
                                {cvFile ? `CV bereit: ${cvFile.name}` : "CV PDF auswaehlen"}
                            </button>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {loading ? "Verarbeite..." : "CV hochladen"}
                        </button>

                        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
                    </div>

                    <aside className="rounded-[28px] border bg-[#fff7ed] p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Ablauf</p>
                        <ol className="mt-5 space-y-4 text-sm text-slate-800">
                            <li className="rounded-2xl border border-amber-200 bg-white px-4 py-3">1. Screening-Ergebnis als Platzhalter</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">2. Interview-Chat mit GPT Wrapper</li>
                            <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">3. Weitere Feedback- und Analyse-Schritte</li>
                        </ol>
                    </aside>
                </section>
            </div>
        </main>
    )
}

export default function UploadPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
            <UploadPageContent />
        </Suspense>
    )
}
