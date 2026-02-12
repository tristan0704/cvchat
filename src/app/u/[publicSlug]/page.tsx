"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type PublicProfileResponse = {
    publicSlug: string
    publishedAt: string | null
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
        skills: string[]
        experience: {
            organization: string
            role: string
            start: string
            end: string
            responsibilities: string[]
            keywords: string[]
        }[]
        projects: {
            name: string
            role: string
            summary: string
            impact: string
            tech: string[]
            links: string[]
        }[]
        education: unknown[]
        languages: unknown[]
        certificates: unknown[]
    }
}

type Message = {
    role: "user" | "assistant"
    content: string
}

const QUICK_PROMPTS = [
    "Welche Skills sind fuer diese Rolle am relevantesten?",
    "Welche Erfahrungen zeigen Ownership und Verantwortung?",
    "Welche Technologien wurden in realen Projekten eingesetzt?",
    "Welche messbaren Ergebnisse sind dokumentiert?",
    "Welche sinnvollen Interviewfragen ergeben sich daraus?",
]

function formatRange(start: string, end: string) {
    const s = start?.trim()
    const e = end?.trim()
    if (!s && !e) return ""
    if (s && e) return `${s} - ${e}`
    return s || e
}

export default function PublicPortfolioPage() {
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
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)
    const bottomRef = useRef<HTMLDivElement | null>(null)
    const chatSectionRef = useRef<HTMLElement | null>(null)

    const smartPrompts = useMemo(() => {
        const role = profile?.meta.position?.trim()
        if (!role) return QUICK_PROMPTS
        return [`Wie gut passt das Profil auf eine ${role}-Rolle?`, ...QUICK_PROMPTS.slice(1)]
    }, [profile?.meta.position])

    useEffect(() => {
        async function loadProfile() {
            setLoading(true)
            setError("")
            try {
                const res = await fetch(`/api/public-profile/${publicSlug}`)
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                    setError(data.error || "Profil nicht gefunden")
                    return
                }
                setProfile(data)
            } catch {
                setError("Server nicht erreichbar")
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
                setError(data.error || "Etwas ist schiefgelaufen")
                return
            }
            setMessages((prev) => [...prev, { role: "assistant", content: data.answer }])
        } catch {
            setError("Server nicht erreichbar")
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

    function openAndJumpToChat() {
        setIsMobileChatOpen(true)
        window.setTimeout(() => {
            chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 50)
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
                <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Link href="/home" className="text-sm font-semibold tracking-tight text-slate-900">
                            CareerIndex
                        </Link>
                        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            Recruiter View
                        </span>
                    </div>

                    {profile && (
                        <div className="grid min-w-0 gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
                            {profile.meta.imageUrl ? (
                                <img src={profile.meta.imageUrl} alt={profile.meta.name} className="h-20 w-20 rounded-2xl object-cover" />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200">
                                    <span className="text-2xl font-semibold text-slate-700">{profile.meta.name?.[0] ?? "?"}</span>
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{profile.meta.name}</h1>
                                <p className="mt-1 break-words text-base text-emerald-700">{profile.meta.position}</p>
                                <p className="mt-3 max-w-3xl break-words text-sm leading-relaxed text-slate-600">{profile.meta.summary}</p>
                                <p className="mt-3 text-xs text-slate-500">Zuletzt aktualisiert: {new Date(profile.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </header>

                {loading && <p className="mt-6 text-sm text-slate-500">Profil wird geladen...</p>}
                {error && !profile && <p className="mt-6 text-sm text-red-600">{error}</p>}
                {profile && (
                    <div className="mt-4 lg:hidden">
                        <button
                            onClick={isMobileChatOpen ? () => setIsMobileChatOpen(false) : openAndJumpToChat}
                            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition ${
                                isMobileChatOpen
                                    ? "border border-slate-300 bg-white text-slate-800"
                                    : "border border-emerald-700 bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-200"
                            }`}
                        >
                            {isMobileChatOpen ? "Chat ausblenden" : "Frag mich"}
                        </button>
                    </div>
                )}

                {profile && (
                    <section className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[1.2fr_1fr]">
                        <div className="order-1 min-w-0 space-y-6">
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Skills</h2>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {profile.profile.skills.length === 0 && <span className="text-sm text-slate-500">Keine Skills hinterlegt.</span>}
                                    {profile.profile.skills.map((skill) => (
                                        <span key={skill} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </article>

                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Experience</h2>
                                <div className="mt-3 space-y-4">
                                    {profile.profile.experience.length === 0 && (
                                        <p className="text-sm text-slate-500">Keine Erfahrungseintraege vorhanden.</p>
                                    )}
                                    {profile.profile.experience.map((item, idx) => (
                                        <div key={`${item.organization}-${item.role}-${idx}`} className="min-w-0 rounded-xl border border-slate-200 p-4">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <h3 className="break-words font-semibold text-slate-900">
                                                    {item.role || "Rolle"} {item.organization ? `@ ${item.organization}` : ""}
                                                </h3>
                                                <span className="text-xs text-slate-500">{formatRange(item.start, item.end)}</span>
                                            </div>
                                            {item.responsibilities.length > 0 && (
                                                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                                    {item.responsibilities.slice(0, 5).map((task) => (
                                                        <li key={task} className="break-words">
                                                            {task}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Projects</h2>
                                <div className="mt-3 space-y-3">
                                    {profile.profile.projects.length === 0 && <p className="text-sm text-slate-500">Keine Projekte hinterlegt.</p>}
                                    {profile.profile.projects.map((project, idx) => (
                                        <div key={`${project.name}-${idx}`} className="min-w-0 rounded-xl border border-slate-200 p-4">
                                            <h3 className="break-words font-semibold text-slate-900">{project.name || "Projekt"}</h3>
                                            {project.role && <p className="break-words text-sm text-emerald-700">{project.role}</p>}
                                            {project.summary && <p className="mt-2 break-words text-sm text-slate-700">{project.summary}</p>}
                                            {project.impact && <p className="mt-2 break-words text-sm text-slate-600">Impact: {project.impact}</p>}
                                        </div>
                                    ))}
                                </div>
                            </article>
                        </div>

                        <aside
                            ref={chatSectionRef}
                            className={`order-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${isMobileChatOpen ? "block" : "hidden"} lg:block`}
                        >
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Recruiter Chat</h2>
                            <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                CareerIndex hilft Recruitern, dein Profil schneller und praeziser zu verstehen.
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {smartPrompts.map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => enqueueQuestion(prompt)}
                                        className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-500"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4 max-h-[52vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="space-y-3">
                                    {messages.length === 0 && (
                                        <p className="text-sm text-slate-500">Noch keine Fragen gestellt.</p>
                                    )}
                                    {messages.map((m, i) => (
                                        <div key={i} className={`flex min-w-0 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div
                                                className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
                                                    m.role === "user"
                                                        ? "rounded-br-md bg-slate-900 text-white"
                                                        : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                                                }`}
                                            >
                                                {m.role === "assistant" ? (
                                                    <div className="prose prose-sm prose-neutral max-w-none prose-p:my-1.5">
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
                                            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                                                Thinking...
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>
                            </div>

                            {error && profile && <p className="mt-3 text-xs text-red-600">{error}</p>}

                            <div className="mt-3">
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="Frage zu Skills, Erfahrung, Projekten..."
                                    rows={2}
                                    className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-base"
                                />
                                <button
                                    onClick={() => enqueueQuestion()}
                                    disabled={isTyping}
                                    className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    Frage senden
                                </button>
                            </div>
                        </aside>

                    </section>
                )}
            </div>
        </main>
    )
}
