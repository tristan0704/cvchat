"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

export default function UploadPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleUpload() {
        if (!file) {
            setError("Please select a PDF file.")
            return
        }

        setLoading(true)
        setError("")

        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Upload failed")
                return
            }

            router.push(`/cv/${data.token}`)
        } catch {
            setError("Server not reachable")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-xl">

                <section className="mb-20">
                    <h1 className="text-3xl font-semibold mb-6">
                        Upload your CV
                    </h1>

                    <p className="text-gray-600 leading-relaxed mb-12">
                        Upload a text-based PDF resume.
                        You’ll receive a private link that allows others to chat with your CV.
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-md border border-gray-300 px-4 py-4 text-left hover:border-black transition"
                    >
                        {file ? (
                            <span className="text-gray-800">
                Selected file: <strong>{file.name}</strong>
              </span>
                        ) : (
                            <span className="text-gray-500">
                Select PDF file…
              </span>
                        )}
                    </button>

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="mt-8 w-full rounded-md bg-black px-7 py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Uploading…" : "Upload CV"}
                    </button>

                    {error && (
                        <p className="mt-6 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                </section>

                <section>
                    <p className="text-sm text-gray-500">
                        Scanned or image-based PDFs are not supported.
                    </p>
                </section>

            </div>
        </main>
    )
}
