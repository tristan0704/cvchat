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
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto w-full max-w-6xl">
                <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-semibold tracking-tight text-gray-900">CareerIndex</span>
                        <span className="w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                            Public Profile
                        </span>
                    </div>

                    {profile && (
                        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div className="grid min-w-0 gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
                                {profile.meta.imageUrl ? (
                                    <img src={profile.meta.imageUrl} alt={profile.meta.name} className="h-20 w-20 rounded-2xl object-cover" />
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-200">
                                        <span className="text-2xl font-semibold text-gray-700">{profile.meta.name?.[0] ?? "?"}</span>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h1 className="break-words text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{profile.meta.name}</h1>
                                    <p className="mt-1 break-words text-base text-gray-700">{profile.meta.position}</p>
                                    <p className="mt-3 max-w-3xl break-words text-sm leading-relaxed text-gray-600">{profile.meta.summary}</p>
                                    <p className="mt-3 text-xs text-gray-500">Zuletzt aktualisiert: {new Date(profile.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 lg:w-72">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Case Study Pitch</p>
                                <p className="mt-2 text-sm text-gray-600">Web-Pitch als PDF-Ersatz.</p>
                                <Link
                                    href={`/u/${publicSlug}/pitch`}
                                    className="mt-4 block rounded-lg bg-black px-4 py-3 text-center text-sm font-medium text-white"
                                >
                                    Pitch Seite oeffnen
                                </Link>
                            </div>
                        </div>
                    )}
                </header>

                {loading && <p className="mt-6 text-sm text-gray-500">Profil wird geladen...</p>}
                {error && !profile && <p className="mt-6 text-sm text-red-600">{error}</p>}

                {profile && (
                    <>
                        <div className="mt-4 lg:hidden">
                            <button
                                onClick={isMobileChatOpen ? () => setIsMobileChatOpen(false) : openAndJumpToChat}
                                className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white"
                            >
                                {isMobileChatOpen ? "Chat ausblenden" : "Personal Chatbot oeffnen"}
                            </button>
                        </div>

                        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-6">
                                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Ueber dieses Profil</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-700">
                                        {profile.profile.person.summary || profile.meta.summary || "Keine Zusammenfassung hinterlegt."}
                                    </p>
                                    {profile.profile.person.location && <p className="mt-3 text-xs text-gray-500">Standort: {profile.profile.person.location}</p>}
                                </article>

                                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Video</h2>
                                    <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                                        <p className="text-sm font-medium text-gray-700">Video Placeholder</p>
                                        <p className="mt-1 text-xs text-gray-500">Hier kann spaeter ein Intro- oder Projektvideo eingebunden werden.</p>
                                    </div>
                                </article>

                                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Skills</h2>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {profile.profile.skills.length === 0 && <span className="text-sm text-gray-500">Keine Skills hinterlegt.</span>}
                                        {profile.profile.skills.slice(0, 40).map((skill) => (
                                            <span key={skill} className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </article>

                                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Projekt Highlights</h2>
                                    <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                        {profile.profile.projects.length === 0 && <p className="text-sm text-gray-500">Keine Projekte hinterlegt.</p>}
                                        {profile.profile.projects.map((project, idx) => (
                                            <div key={`${project.name}-${idx}`} className="rounded-xl border border-gray-200 p-4">
                                                <h3 className="break-words font-semibold text-gray-900">{project.name || "Projekt"}</h3>
                                                {project.role && <p className="break-words text-sm text-gray-700">{project.role}</p>}
                                                {project.summary && <p className="mt-2 break-words text-sm text-gray-700">{project.summary}</p>}
                                                {project.impact && <p className="mt-2 break-words text-sm text-gray-600">Ergebnis: {project.impact}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </article>

                                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Erfahrung</h2>
                                    <div className="mt-3 max-h-[420px] space-y-4 overflow-y-auto pr-1">
                                        {profile.profile.experience.length === 0 && <p className="text-sm text-gray-500">Keine Erfahrungseintraege vorhanden.</p>}
                                        {profile.profile.experience.map((item, idx) => (
                                            <div key={`${item.organization}-${item.role}-${idx}`} className="rounded-xl border border-gray-200 p-4">
                                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                    <h3 className="break-words font-semibold text-gray-900">
                                                        {item.role || "Rolle"} {item.organization ? `@ ${item.organization}` : ""}
                                                    </h3>
                                                    <span className="text-xs text-gray-500">{formatRange(item.start, item.end)}</span>
                                                </div>
                                                {item.responsibilities.length > 0 && (
                                                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                                        {item.responsibilities.slice(0, 4).map((task) => (
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
                            </div>

                            <aside
                                id="chatbot"
                                ref={chatSectionRef}
                                className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:block ${isMobileChatOpen ? "block" : "hidden"}`}
                            >
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Personal Chatbot</h2>
                                <p className="mt-2 text-xs leading-relaxed text-gray-600">Fragen zu Skills, Projekten und Erfahrung auf Basis der freigegebenen Daten.</p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {smartPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => enqueueQuestion(prompt)}
                                            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-gray-500"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    <div className="space-y-3">
                                        {messages.length === 0 && <p className="text-sm text-gray-500">Noch keine Fragen gestellt.</p>}
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                                <div
                                                    className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
                                                        m.role === "user"
                                                            ? "rounded-br-md bg-black text-white"
                                                            : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
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
                                                <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">Thinking...</div>
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
                                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-base"
                                    />
                                    <button
                                        onClick={() => enqueueQuestion()}
                                        disabled={isTyping}
                                        className="mt-2 w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                        Frage senden
                                    </button>
                                </div>
                            </aside>
                        </section>
                    </>
                )}
            </div>
        </main>
    )
}
