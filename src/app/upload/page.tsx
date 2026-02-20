"use client"
// DATEIUEBERSICHT: Upload-Seite fuer CV, Zertifikate, Bild und Zusatzinformationen.

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"

const pickerButtonClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800"

export default function UploadPage() {
    const router = useRouter()

    // Onboarding-Eingaben:
    // alles, was fuer die erste Profilgenerierung gebraucht wird.
    const cvInputRef = useRef<HTMLInputElement | null>(null)
    const certificateInputRef = useRef<HTMLInputElement | null>(null)
    const imageInputRef = useRef<HTMLInputElement | null>(null)

    const [cvFile, setCvFile] = useState<File | null>(null)
    const [certificateFiles, setCertificateFiles] = useState<File[]>([])
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [additionalText, setAdditionalText] = useState("")
    const [projectPlaceholder, setProjectPlaceholder] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleUpload() {
        // Ohne CV macht der Backend-Parser keinen Sinn.
        if (!cvFile) {
            setError("Bitte zuerst ein CV-PDF auswaehlen.")
            return
        }

        setLoading(true)
        setError("")

        const formData = new FormData()
        formData.append("cv", cvFile)
        certificateFiles.forEach((file) => formData.append("certificates", file))

        if (imageFile) formData.append("image", imageFile)
        if (additionalText.trim()) formData.append("additionalText", additionalText.trim())
        if (projectPlaceholder.trim()) formData.append("projectPlaceholder", projectPlaceholder.trim())

        try {
            // Multipart-Upload an die zentrale Onboarding-Route.
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Upload fehlgeschlagen.")
                setLoading(false)
                return
            }

            // Nach erfolgreichem Parsing direkt ins persoehnliche Dashboard.
            router.push(`/cv/${data.token}`)
        } catch {
            setError("Server nicht erreichbar.")
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-lg border bg-white p-4">
                    <h1 className="text-lg font-semibold">Onboarding</h1>
                    <Link href="/home" className="rounded-md border px-3 py-2 text-sm">
                        Zurueck
                    </Link>
                </header>

                <section className="rounded-lg border bg-white p-6">
                    <h2 className="text-xl font-semibold">Upload</h2>
                    <p className="mt-2 text-sm text-slate-700">CV ist Pflicht. Zertifikate, Bild und Zusatztext sind optional.</p>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                        {/* Linke Seite: echte Inputs fuer die aktuelle MVP-Pipeline. */}
                        <div className="space-y-3">
                            <input
                                ref={cvInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                            />
                            <button type="button" onClick={() => cvInputRef.current?.click()} className={pickerButtonClass}>
                                {cvFile ? `CV: ${cvFile.name}` : "CV PDF auswaehlen (Pflicht)"}
                            </button>

                            <input
                                ref={certificateInputRef}
                                type="file"
                                accept="application/pdf"
                                multiple
                                onChange={(e) => setCertificateFiles(e.target.files ? Array.from(e.target.files) : [])}
                                className="hidden"
                            />
                            <button type="button" onClick={() => certificateInputRef.current?.click()} className={pickerButtonClass}>
                                {certificateFiles.length > 0 ? `${certificateFiles.length} Zertifikat(e)` : "Zertifikate (optional)"}
                            </button>

                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                            />
                            <button type="button" onClick={() => imageInputRef.current?.click()} className={pickerButtonClass}>
                                {imageFile ? `Bild: ${imageFile.name}` : "Profilbild (optional)"}
                            </button>

                            <textarea
                                value={additionalText}
                                onChange={(e) => setAdditionalText(e.target.value)}
                                placeholder="Zusatztext (optional)"
                                rows={5}
                                className={inputClass}
                            />
                        </div>

                        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
                            <span className="inline-flex rounded bg-yellow-300 px-2 py-1 text-xs font-semibold">BAUSTELLE</span>
                            <h3 className="mt-3 text-sm font-semibold">Projekt-Upload (nur Placeholder)</h3>
                            <p className="mt-1 text-xs text-slate-700">
                                Projektdaten werden spaeter strukturiert erfasst. Aktuell nur Notiz fuer die naechste Ausbaustufe.
                            </p>
                            <textarea
                                value={projectPlaceholder}
                                onChange={(e) => setProjectPlaceholder(e.target.value)}
                                placeholder="Projekt-Upload Notiz"
                                rows={8}
                                className="mt-3 w-full rounded-md border border-yellow-300 bg-white px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {loading ? "Verarbeite..." : "Profil erstellen"}
                    </button>

                    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                </section>
            </div>
        </main>
    )
}


