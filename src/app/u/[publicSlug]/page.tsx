"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type PublicProfileResponse = {
    publicSlug: string
    cvToken: string
    updatedAt: string
    meta: {
        name: string
        position: string
        summary: string
        imageUrl?: string | null
    }
    profile: {
        person: {
            name: string
            title: string
            location: string
            summary: string
        }
        projects: {
            name: string
            role: string
            summary: string
            impact: string
            tech: string[]
            links: string[]
        }[]
    }
}

type Message = {
    role: "user" | "assistant"
    content: string
}

const QUICK_PROMPTS = [
    "Welche Projekte passen am besten zur Rolle?",
    "Welche messbaren Ergebnisse sind vorhanden?",
    "Welche Technologien wurden praktisch eingesetzt?",
    "Welche guten Interviewfragen ergeben sich?",
]

export default function PublicProfilePage() {
    const params = useParams()
    const publicSlug = params.publicSlug as string
    const chatStorageKey = `public-portfolio-chat-${publicSlug}`

    const [profile, setProfile] = useState<PublicProfileResponse | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [question, setQuestion] = useState("")
    const [loading, setLoading] = useState(true)
    const [isTyping, setIsTyping] = useState(false)
    const [error, setError] = useState("")
    const [queuedQuestions, setQueuedQuestions] = useState<string[]>([])
    const bottomRef = useRef<HTMLDivElement | null>(null)

    const smartPrompts = useMemo(() => {
        const role = profile?.meta.position?.trim()
        if (!role) return QUICK_PROMPTS
        return [`Wie gut passt dieses Profil auf ${role}?`, ...QUICK_PROMPTS.slice(1)]
    }, [profile?.meta.position])

    useEffect(() => {
        async function loadProfile() {
            setLoading(true)
            setError("")
            try {
                const res = await fetch(`/api/public-profile/${publicSlug}`)
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                    setError(data.error || "Profile not found")
                    return
                }
                setProfile(data)
            } catch {
                setError("Server not reachable")
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [publicSlug])

    useEffect(() => {
        try {
            const raw = localStorage.getItem(chatStorageKey)
            if (!raw) return
            const parsed = JSON.parse(raw) as Message[]
            if (Array.isArray(parsed)) setMessages(parsed)
        } catch {}
    }, [chatStorageKey])

    useEffect(() => {
        try {
            localStorage.setItem(chatStorageKey, JSON.stringify(messages))
        } catch {}
    }, [chatStorageKey, messages])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
    }, [messages.length])

    async function askQuestion(raw?: string) {
        const nextQuestion = (raw ?? question).trim()
        if (!nextQuestion) return
        setMessages((prev) => [...prev, { role: "user", content: nextQuestion }])
        setQuestion("")
        setIsTyping(true)
        setError("")

        try {
            const res = await fetch("/api/public-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicSlug, question: nextQuestion }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data.error || "Something went wrong")
                return
            }
            setMessages((prev) => [...prev, { role: "assistant", content: data.answer }])
        } catch {
            setError("Server not reachable")
        } finally {
            setIsTyping(false)
        }
    }

    function enqueueQuestion(raw?: string) {
        const nextQuestion = (raw ?? question).trim()
        if (!nextQuestion) return
        setQueuedQuestions((prev) => [...prev, nextQuestion])
        if (!raw) setQuestion("")
    }

    useEffect(() => {
        if (isTyping || queuedQuestions.length === 0) return
        const [next, ...rest] = queuedQuestions
        setQueuedQuestions(rest)
        askQuestion(next)
    }, [isTyping, queuedQuestions])

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <header className="rounded-lg border bg-white p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-600">Public Profile</p>
                    {profile && (
                        <div className="mt-3 flex items-start gap-3">
                            {profile.meta.imageUrl ? (
                                <img src={profile.meta.imageUrl} alt={profile.meta.name} className="h-14 w-14 rounded-md object-cover" />
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-200 text-lg font-semibold">
                                    {profile.meta.name?.[0] ?? "?"}
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-semibold">{profile.meta.name}</h1>
                                <p className="text-sm text-slate-700">{profile.meta.position}</p>
                                <p className="mt-2 text-sm text-slate-700">{profile.meta.summary}</p>
                            </div>
                        </div>
                    )}
                </header>

                {loading && <p className="mt-4 text-sm text-slate-600">Loading profile...</p>}
                {error && !profile && <p className="mt-4 text-sm text-red-600">{error}</p>}

                {profile && (
                    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                        <div className="rounded-lg border bg-white p-5">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Projekte</h2>
                            <div className="mt-3 space-y-3">
                                {profile.profile.projects.length === 0 && <p className="text-sm text-slate-600">Keine Projekte vorhanden.</p>}
                                {profile.profile.projects.map((project, idx) => (
                                    <article key={`${project.name}-${idx}`} className="rounded-md border p-3">
                                        <h3 className="font-semibold">{project.name || "Projekt"}</h3>
                                        {project.role && <p className="text-sm text-slate-700">{project.role}</p>}
                                        {project.summary && <p className="mt-2 text-sm text-slate-700">{project.summary}</p>}
                                        {project.impact && <p className="mt-2 text-sm text-slate-700">Ergebnis: {project.impact}</p>}
                                    </article>
                                ))}
                            </div>
                        </div>

                        <aside className="rounded-lg border bg-white p-5">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Chatbot</h2>
                            <p className="mt-2 text-xs text-slate-600">Fragen zu Profil, Projekten und Rollen-Fit.</p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {smartPrompts.map((prompt) => (
                                    <button key={prompt} onClick={() => enqueueQuestion(prompt)} className="rounded-md border px-2 py-1 text-xs">
                                        {prompt}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3 h-[380px] overflow-y-auto rounded-md border p-3">
                                <div className="space-y-3">
                                    {messages.length === 0 && <p className="text-sm text-slate-600">Noch keine Fragen.</p>}
                                    {messages.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[92%] rounded-md px-3 py-2 text-sm ${m.role === "user" ? "bg-slate-900 text-white" : "border bg-slate-50"}`}>
                                                {m.role === "assistant" ? (
                                                    <div className="prose prose-sm max-w-none prose-p:my-1">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    m.content
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">Thinking...</div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>
                            </div>

                            {error && profile && <p className="mt-2 text-xs text-red-600">{error}</p>}

                            <div className="mt-3">
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="Frage stellen..."
                                    rows={2}
                                    className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm"
                                />
                                <button
                                    onClick={() => enqueueQuestion()}
                                    disabled={isTyping}
                                    className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    Senden
                                </button>
                            </div>
                        </aside>
                    </section>
                )}
            </div>
        </main>
    )
}
