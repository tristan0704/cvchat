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
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 2</p>
                        <h1 className="text-xl font-semibold">CV Upload</h1>
                    </div>
                    <Link href="/simulate/new" className="rounded-full border px-4 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="rounded-[28px] border bg-white p-6 sm:p-8">
                    <p className="text-sm text-slate-700">{role}</p>

                    <div className="mt-6">
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
                            {cvFile ? `CV: ${cvFile.name}` : "CV PDF auswaehlen"}
                        </button>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {loading ? "Verarbeite..." : "Weiter"}
                    </button>

                    {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
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
