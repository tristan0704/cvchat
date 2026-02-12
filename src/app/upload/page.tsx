"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function UploadPage() {
    const router = useRouter()

    const cvInputRef = useRef<HTMLInputElement | null>(null)
    const referenceInputRef = useRef<HTMLInputElement | null>(null)
    const certificateInputRef = useRef<HTMLInputElement | null>(null)
    const imageInputRef = useRef<HTMLInputElement | null>(null)

    const [cvFile, setCvFile] = useState<File | null>(null)
    const [referenceFiles, setReferenceFiles] = useState<File[]>([])
    const [certificateFiles, setCertificateFiles] = useState<File[]>([])
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [additionalText, setAdditionalText] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [loadingStep, setLoadingStep] = useState<string | null>(null)

    async function handleUpload() {
        if (!cvFile) {
            setError("Please select your CV PDF first.")
            return
        }

        setLoading(true)
        setError("")
        setLoadingStep("Uploading files...")

        const formData = new FormData()
        formData.append("cv", cvFile)
        referenceFiles.forEach((file) => formData.append("references", file))
        certificateFiles.forEach((file) => formData.append("certificates", file))

        if (imageFile) formData.append("image", imageFile)
        if (additionalText.trim()) formData.append("additionalText", additionalText.trim())

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            setLoadingStep("Analyzing and structuring your profile...")
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Upload failed.")
                setLoading(false)
                setLoadingStep(null)
                return
            }

            setLoadingStep("Preparing your chat...")
            setTimeout(() => router.push(`/cv/${data.token}`), 450)
        } catch {
            setError("Server not reachable.")
            setLoading(false)
            setLoadingStep(null)
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto w-full max-w-3xl">
                <header className="mb-8 flex items-center justify-between">
                    <Link href="/home" className="text-lg font-semibold tracking-tight text-gray-900">
                        CareerIndex
                    </Link>
                    <Link
                        href="/home"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
                    >
                        Back
                    </Link>
                </header>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                        Build your CareerIndex
                    </h1>
                    <p className="mt-3 text-sm text-gray-600 sm:text-base">
                        Upload your CV and supporting documents. We convert them into a structured career profile for recruiters.
                    </p>

                    <div className="mt-6 space-y-3">
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
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-4 text-left text-sm text-gray-700"
                        >
                            {cvFile ? `CV selected: ${cvFile.name}` : "Select CV PDF (required)"}
                        </button>

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
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-4 text-left text-sm text-gray-700"
                        >
                            {referenceFiles.length > 0
                                ? `${referenceFiles.length} reference file(s) selected`
                                : "Add references/testimonials (optional)"}
                        </button>

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
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-4 text-left text-sm text-gray-700"
                        >
                            {certificateFiles.length > 0
                                ? `${certificateFiles.length} certificate(s) selected`
                                : "Add certificates or extra documents (optional)"}
                        </button>

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
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-4 text-left text-sm text-gray-700"
                        >
                            {imageFile ? `Profile photo selected: ${imageFile.name}` : "Add profile photo (optional)"}
                        </button>

                        <textarea
                            value={additionalText}
                            onChange={(e) => setAdditionalText(e.target.value)}
                            placeholder="Additional context for recruiters (optional)"
                            rows={4}
                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3"
                        />

                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            className="w-full rounded-lg bg-black px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Create CareerIndex"}
                        </button>

                        {loading && loadingStep && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
                                <span>{loadingStep}</span>
                            </div>
                        )}
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                </section>
            </div>
        </main>
    )
}
