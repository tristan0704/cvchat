"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

export default function UploadPage() {
    const router = useRouter()

    // file inputs
    const cvInputRef = useRef<HTMLInputElement | null>(null)
    const referenceInputRef = useRef<HTMLInputElement | null>(null)
    const certificateInputRef = useRef<HTMLInputElement | null>(null)
    const imageInputRef = useRef<HTMLInputElement | null>(null)

    // state
    const [cvFile, setCvFile] = useState<File | null>(null)
    const [referenceFiles, setReferenceFiles] = useState<File[]>([])
    const [certificateFiles, setCertificateFiles] = useState<File[]>([])
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [additionalText, setAdditionalText] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [loadingStep, setLoadingStep] = useState<string | null>(null)

    // upload
    async function handleUpload() {
        if (!cvFile) {
            setError("Please select a CV PDF file.")
            return
        }

        setLoading(true)
        setError("")
        setLoadingStep("Uploading documents…")

        const formData = new FormData()
        formData.append("cv", cvFile)

        referenceFiles.forEach((file) => {
            formData.append("references", file)
        })

        certificateFiles.forEach((file) => {
            formData.append("certificates", file)
        })

        if (imageFile) {
            formData.append("image", imageFile)
        }

        if (additionalText.trim()) {
            formData.append("additionalText", additionalText)
        }

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            setLoadingStep("Analyzing content…")

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Upload failed")
                setLoading(false)
                setLoadingStep(null)
                return
            }

            setLoadingStep("Building AI knowledge context…")

            setTimeout(() => {
                router.push(`/cv/${data.token}`)
            }, 600)
        } catch {
            setError("Server not reachable")
            setLoading(false)
            setLoadingStep(null)
        }
    }

    return (
        <main className="min-h-screen bg-white px-6 py-20">
            <div className="mx-auto max-w-2xl">

                {/* header */}
                <section className="mb-14">
                    <h1 className="text-3xl font-semibold mb-4">
                        Upload application material
                    </h1>
                    <p className="text-gray-500 leading-relaxed">
                        Upload your CV and supporting documents. All files will be processed
                        together as one application context.
                    </p>
                </section>

                {/* form */}
                <section className="space-y-6">

                    {/* CV */}
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
                        className="w-full rounded-md border border-gray-300 px-5 py-4 text-left hover:border-black transition"
                    >
                        {cvFile ? (
                            <span className="text-gray-800">
                CV selected · <strong>{cvFile.name}</strong>
              </span>
                        ) : (
                            <span className="text-gray-500">
                Select CV PDF (required)
              </span>
                        )}
                    </button>

                    {/* references */}
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
                        className="w-full rounded-md border border-gray-300 px-5 py-4 text-left hover:border-black transition"
                    >
                        {referenceFiles.length > 0 ? (
                            <span className="text-gray-800">
                {referenceFiles.length} reference file(s) added
              </span>
                        ) : (
                            <span className="text-gray-500">
                Add references or testimonials (optional)
              </span>
                        )}
                    </button>

                    {/* certificates */}
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
                        className="w-full rounded-md border border-gray-300 px-5 py-4 text-left hover:border-black transition"
                    >
                        {certificateFiles.length > 0 ? (
                            <span className="text-gray-800">
                {certificateFiles.length} certificate file(s) added
              </span>
                        ) : (
                            <span className="text-gray-500">
                Add certificates or additional documents
              </span>
                        )}
                    </button>

                    {/* image */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full rounded-md border border-gray-300 px-5 py-4 text-left hover:border-black transition"
                    >
                        {imageFile ? (
                            <span className="text-gray-800">
                Profile image selected · <strong>{imageFile.name}</strong>
              </span>
                        ) : (
                            <span className="text-gray-500">
                Add profile image (optional)
              </span>
                        )}
                    </button>

                    {/* additional text */}
                    <textarea
                        value={additionalText}
                        onChange={(e) => setAdditionalText(e.target.value)}
                        placeholder="Additional notes or context (optional)"
                        rows={4}
                        className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />

                    {/* submit */}
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full rounded-md bg-black px-7 py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing application…" : "Create CV chat"}
                    </button>

                    {/* loading state */}
                    {loading && loadingStep && (
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
                            {loadingStep}
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-600">
                            {error}
                        </p>
                    )}
                </section>

                {/* footer */}
                <section className="mt-14">
                    <p className="text-sm text-gray-500">
                        Only text-based PDFs are supported. All uploaded files are processed together.
                    </p>
                </section>

            </div>
        </main>
    )
}
