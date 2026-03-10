"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

type Message = {
    role: "user" | "assistant"
    content: string
}

const starterQuestions = [
    "Warum diese Rolle?",
    "Erzaehl von einem Projekt, auf das du stolz bist.",
    "Warum passt du in ein Team fuer diese Rolle?",
]

function InterviewPageContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token") ?? ""
    const role = searchParams.get("role") ?? "Backend Developer"

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: `Willkommen. Das ist aktuell ein einfacher Interview-Chat fuer ${role}.`,
        },
    ])
    const [question, setQuestion] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function askInterview(promptOverride?: string) {
        const nextQuestion = (promptOverride ?? question).trim()
        if (!nextQuestion || loading) return

        setMessages((prev) => [...prev, { role: "user", content: nextQuestion }])
        setQuestion("")
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/simulate/interview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    role,
                    question: nextQuestion,
                }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Interview-Anfrage fehlgeschlagen.")
                return
            }

            setMessages((prev) => [...prev, { role: "assistant", content: data.answer }])
        } catch {
            setError("Server nicht erreichbar.")
        } finally {
            setLoading(false)
        }
    }

    const nextHref = `/simulate/interview-feedback?${new URLSearchParams({ token, role }).toString()}`

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Step 4</p>
                        <h1 className="text-xl font-semibold">Interview</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/simulate/screening?${new URLSearchParams({ token, role, screening: "passed" }).toString()}`} className="rounded-full border border-white/15 px-4 py-2 text-sm">
                            Zurueck
                        </Link>
                        <Link href={nextHref} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950">
                            Weiter zum Feedback
                        </Link>
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
                    <aside className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Setup</p>
                        <div className="mt-5 space-y-3 text-sm text-slate-300">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Rolle</p>
                                <p className="mt-1 text-slate-100">{role}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Interviewer Mode</p>
                                <p className="mt-1 text-slate-100">Einfacher GPT Wrapper</p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                            {starterQuestions.map((starterQuestion) => (
                                <button
                                    key={starterQuestion}
                                    onClick={() => askInterview(starterQuestion)}
                                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-200"
                                >
                                    {starterQuestion}
                                </button>
                            ))}
                        </div>
                    </aside>

                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                        <div className="h-[420px] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                            <div className="space-y-3">
                                {messages.map((message, index) => (
                                    <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                                                message.role === "user" ? "bg-amber-400 text-slate-950" : "border border-white/10 bg-white/5 text-slate-100"
                                            }`}
                                        >
                                            {message.content}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                                            Interviewer antwortet...
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                rows={4}
                                placeholder="Deine Antwort eingeben..."
                                className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-300"
                            />
                            <div className="mt-3 flex items-center justify-between">
                                {error ? <p className="text-sm text-rose-300">{error}</p> : <span className="text-xs text-slate-500">Aktuell nur Vorbereitung fuer echtes Interview-Scoring.</span>}
                                <button
                                    onClick={() => askInterview()}
                                    disabled={loading}
                                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                                >
                                    Senden
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default function InterviewPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
            <InterviewPageContent />
        </Suspense>
    )
}
