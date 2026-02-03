"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

export default function UploadPage() {
    const router = useRouter()

    const cvInputRef = useRef<HTMLInputElement | null>(null)
    const referenceInputRef = useRef<HTMLInputElement | null>(null)
    const certificateInputRef = useRef<HTMLInputElement | null>(null)

    const [cvFile, setCvFile] = useState<File | null>(null)
    const [referenceFiles, setReferenceFiles] = useState<File[]>([])
    const [certificateFiles, setCertificateFiles] = useState<File[]>([])
    const [additionalText, setAdditionalText] = useState("")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleUpload() {
        if (!cvFile) {
            setError("Please select a CV PDF file.")
            return
        }

        setLoading(true)
        setError("")

        const formData = new FormData()
        formData.append("cv", cvFile)

        referenceFiles.forEach((file) => {
            formData.append("references", file)
        })

        certificateFiles.forEach((file) => {
            formData.append("certificates", file)
        })

        if (additionalText.trim()) {
            formData.append("additionalText", additionalText)
        }

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
                        Upload your application documents
                    </h1>

                    <p className="text-gray-600 leading-relaxed mb-12">
                        Upload your CV and optionally add references, certificates,
                        or additional information.
                    </p>

                    {/* CV Upload */}
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
                        className="w-full rounded-md border border-gray-300 px-4 py-4 text-left hover:border-black transition"
                    >
                        {cvFile ? (
                            <span className="text-gray-800">
                Selected CV: <strong>{cvFile.name}</strong>
              </span>
                        ) : (
                            <span className="text-gray-500">
                Select CV PDF (required)
              </span>
                        )}
                    </button>

                    {/* References */}
                    <input
                        ref={referenceInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={(e) =>
                            setReferenceFiles(e.target.files ? Array.from(e.target.files) : [])
                        }
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => referenceInputRef.current?.click()}
                        className="mt-6 w-full rounded-md border border-gray-300 px-4 py-4 text-left hover:border-black transition"
                    >
                        {referenceFiles.length > 0 ? (
                            <span className="text-gray-800">
                {referenceFiles.length} reference file(s) selected
              </span>
                        ) : (
                            <span className="text-gray-500">
                Add reference / testimonial PDFs (optional)
              </span>
                        )}
                    </button>

                    {/* Certificates */}
                    <input
                        ref={certificateInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={(e) =>
                            setCertificateFiles(e.target.files ? Array.from(e.target.files) : [])
                        }
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => certificateInputRef.current?.click()}
                        className="mt-6 w-full rounded-md border border-gray-300 px-4 py-4 text-left hover:border-black transition"
                    >
                        {certificateFiles.length > 0 ? (
                            <span className="text-gray-800">
                {certificateFiles.length} certificate file(s) selected
              </span>
                        ) : (
                            <span className="text-gray-500">
                Add certificate PDFs (optional)
              </span>
                        )}
                    </button>

                    {/* Additional Text */}
                    <textarea
                        value={additionalText}
                        onChange={(e) => setAdditionalText(e.target.value)}
                        placeholder="Additional information (optional)"
                        rows={5}
                        className="mt-8 w-full rounded-md border border-gray-300 px-4 py-3 text-sm"
                    />

                    {/* Submit */}
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="mt-10 w-full rounded-md bg-black px-7 py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Uploading…" : "Upload documents"}
                    </button>

                    {error && (
                        <p className="mt-6 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                </section>

                <section>
                    <p className="text-sm text-gray-500">
                        Only text-based PDFs are supported. Scanned documents are not processed.
                    </p>
                </section>

            </div>
        </main>
    )
}
