"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { marketingCopy } from "@/lib/marketingCopy"

const inputClass =
    "w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none"

const pickerButtonClass =
    "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/[0.07]"

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
    const [githubUrl, setGithubUrl] = useState("")
    const [targetRole, setTargetRole] = useState("")
    const [projectSummary, setProjectSummary] = useState("")
    const [projectStack, setProjectStack] = useState("")
    const [projectTasks, setProjectTasks] = useState("")
    const [projectProblem, setProjectProblem] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [loadingStep, setLoadingStep] = useState<string | null>(null)

    function buildProjectContext() {
        const lines = [
            githubUrl.trim() && `GitHub URL: ${githubUrl.trim()}`,
            targetRole.trim() && `Target role: ${targetRole.trim()}`,
            projectSummary.trim() && `Project context: ${projectSummary.trim()}`,
            projectStack.trim() && `Stack and tools: ${projectStack.trim()}`,
            projectTasks.trim() && `Main tasks and contributions: ${projectTasks.trim()}`,
            projectProblem.trim() && `Hard problem solved: ${projectProblem.trim()}`,
        ].filter(Boolean)

        if (lines.length === 0) return ""
        return `Project signal intake:\n${lines.join("\n")}`
    }

    async function handleUpload() {
        if (!cvFile) {
            setError("Please select your CV PDF first (current required input).")
            return
        }

        if (githubUrl.trim()) {
            try {
                const parsed = new URL(githubUrl.trim())
                if (parsed.hostname !== "github.com") {
                    setError("GitHub URL must use github.com")
                    return
                }
            } catch {
                setError("Please enter a valid GitHub URL")
                return
            }
        }

        setLoading(true)
        setError("")
        setLoadingStep("Uploading files...")

        const formData = new FormData()
        formData.append("cv", cvFile)
        referenceFiles.forEach((file) => formData.append("references", file))
        certificateFiles.forEach((file) => formData.append("certificates", file))

        if (imageFile) formData.append("image", imageFile)
        const projectContext = buildProjectContext()
        const mergedContext = [additionalText.trim(), projectContext].filter(Boolean).join("\n\n")
        if (mergedContext) formData.append("additionalText", mergedContext)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            setLoadingStep("Analyzing project signals...")
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Upload failed.")
                setLoading(false)
                setLoadingStep(null)
                return
            }

            setLoadingStep("Preparing your dashboard...")
            setTimeout(() => router.push(`/cv/${data.token}`), 450)
        } catch {
            setError("Server not reachable.")
            setLoading(false)
            setLoadingStep(null)
        }
    }

    return (
        <main className="min-h-screen bg-[#020817] text-slate-100">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(59,130,246,0.16),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.16),transparent_42%),linear-gradient(180deg,#020617_0%,#040B1E_45%,#030514_100%)]" />
            </div>

            <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 md:pb-24 md:pt-8">
                <header className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-[#050C22]/80 px-4 py-3 backdrop-blur-md md:px-5">
                    <Link href="/home" className="inline-flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-semibold text-white">
                            CI
                        </span>
                        <span className="text-base font-semibold tracking-tight text-white">CareerIndex</span>
                    </Link>
                    <Link href="/home" className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
                        Back
                    </Link>
                </header>

                <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-7 md:p-8">
                    <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">Project-first intake</p>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{marketingCopy.upload.title}</h1>
                    <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">{marketingCopy.upload.intro}</p>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
                        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Step 1</p>
                            <h2 className="mt-2 text-lg font-semibold text-white">Project signal intake</h2>
                            <p className="mt-1 text-xs text-slate-300">{marketingCopy.upload.projectSectionText}</p>
                            <p className="mt-1 text-xs text-slate-400">{marketingCopy.upload.repoBetaNote}</p>

                            <div className="mt-4 space-y-2.5">
                                <input
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    placeholder="GitHub repository URL (optional)"
                                    className={inputClass}
                                />
                                <input
                                    value={targetRole}
                                    onChange={(e) => setTargetRole(e.target.value)}
                                    placeholder="Target role (e.g. Backend Intern)"
                                    className={inputClass}
                                />
                                <textarea
                                    value={projectSummary}
                                    onChange={(e) => setProjectSummary(e.target.value)}
                                    placeholder="Project context in 1-3 sentences"
                                    rows={2}
                                    className={inputClass}
                                />
                                <textarea
                                    value={projectStack}
                                    onChange={(e) => setProjectStack(e.target.value)}
                                    placeholder="Tech stack and tools (comma separated)"
                                    rows={2}
                                    className={inputClass}
                                />
                                <textarea
                                    value={projectTasks}
                                    onChange={(e) => setProjectTasks(e.target.value)}
                                    placeholder="Your key tasks and contributions"
                                    rows={2}
                                    className={inputClass}
                                />
                                <textarea
                                    value={projectProblem}
                                    onChange={(e) => setProjectProblem(e.target.value)}
                                    placeholder="Biggest problem solved and measurable result"
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>
                        </article>

                        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">Step 2</p>
                            <h2 className="mt-2 text-lg font-semibold text-white">Context documents</h2>
                            <p className="mt-1 text-xs text-slate-300">CV is currently required. Everything else is optional enrichment.</p>

                            <div className="mt-4 space-y-2.5">
                                <input
                                    ref={cvInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                                    className="hidden"
                                />
                                <button type="button" onClick={() => cvInputRef.current?.click()} className={pickerButtonClass}>
                                    {cvFile ? `CV selected: ${cvFile.name}` : "Select CV PDF (required)"}
                                </button>

                                <input
                                    ref={referenceInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    multiple
                                    onChange={(e) => setReferenceFiles(e.target.files ? Array.from(e.target.files) : [])}
                                    className="hidden"
                                />
                                <button type="button" onClick={() => referenceInputRef.current?.click()} className={pickerButtonClass}>
                                    {referenceFiles.length > 0
                                        ? `${referenceFiles.length} reference file(s) selected`
                                        : "Add references/testimonials (optional)"}
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
                                <button type="button" onClick={() => imageInputRef.current?.click()} className={pickerButtonClass}>
                                    {imageFile ? `Profile photo selected: ${imageFile.name}` : "Add profile photo (optional)"}
                                </button>

                                <textarea
                                    value={additionalText}
                                    onChange={(e) => setAdditionalText(e.target.value)}
                                    placeholder="Additional context for recruiters (optional)"
                                    rows={4}
                                    className={inputClass}
                                />
                            </div>
                        </article>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(76,105,255,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Processing..." : marketingCopy.upload.cta}
                        </button>

                        {loading && loadingStep && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
                                <span>{loadingStep}</span>
                            </div>
                        )}

                        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
                    </div>
                </section>
            </div>
        </main>
    )
}
