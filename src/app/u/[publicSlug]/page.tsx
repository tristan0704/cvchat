"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { marketingCopy } from "@/lib/marketingCopy"

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
    "Which skills are most relevant for this role?",
    "Which project shows strongest ownership?",
    "Which technologies were used in real delivery?",
    "What measurable outcomes are documented?",
    "What are good interview follow-up questions?",
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
        return [`How well does this profile match a ${role} role?`, ...QUICK_PROMPTS.slice(1)]
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

    function openAndJumpToChat() {
        setIsMobileChatOpen(true)
        window.setTimeout(() => {
            chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 50)
    }

    return (
        <main className="min-h-screen bg-[#020817] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(59,130,246,0.16),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.16),transparent_42%),linear-gradient(180deg,#020617_0%,#040B1E_45%,#030514_100%)]" />
            </div>

            <div className="mx-auto w-full max-w-6xl">
                <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-8">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-semibold tracking-tight text-white">CareerIndex</span>
                        <span className="w-fit rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-300">
                            {marketingCopy.publicProfile.badge}
                        </span>
                    </div>

                    {profile && (
                        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div className="grid min-w-0 gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
                                {profile.meta.imageUrl ? (
                                    <img src={profile.meta.imageUrl} alt={profile.meta.name} className="h-20 w-20 rounded-2xl object-cover" />
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
                                        <span className="text-2xl font-semibold text-slate-100">{profile.meta.name?.[0] ?? "?"}</span>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{profile.meta.name}</h1>
                                    <p className="mt-1 break-words text-base text-slate-300">{profile.meta.position}</p>
                                    <p className="mt-3 max-w-3xl break-words text-sm leading-relaxed text-slate-300">{profile.meta.summary}</p>
                                    <p className="mt-3 text-xs text-slate-400">Last updated: {new Date(profile.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Project case-study pitch</p>
                                <p className="mt-2 text-sm text-slate-300">Structured project pitch view for hiring reviews.</p>
                                <Link
                                    href={`/u/${publicSlug}/pitch`}
                                    className="mt-4 block rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-center text-sm font-semibold text-white"
                                >
                                    Open pitch page
                                </Link>
                            </div>
                        </div>
                    )}
                </header>

                {loading && <p className="mt-6 text-sm text-slate-400">Loading profile...</p>}
                {error && !profile && <p className="mt-6 text-sm text-rose-300">{error}</p>}

                {profile && (
                    <>
                        <div className="mt-4 lg:hidden">
                            <button
                                onClick={isMobileChatOpen ? () => setIsMobileChatOpen(false) : openAndJumpToChat}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white"
                            >
                                {isMobileChatOpen ? "Hide chat" : "Open profile chatbot"}
                            </button>
                        </div>

                        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-6">
                                <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{marketingCopy.publicProfile.aboutTitle}</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                        {profile.profile.person.summary || profile.meta.summary || "No summary provided."}
                                    </p>
                                    {profile.profile.person.location && <p className="mt-3 text-xs text-slate-400">Location: {profile.profile.person.location}</p>}
                                </article>

                                <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{marketingCopy.publicProfile.skillsTitle}</h2>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {profile.profile.skills.length === 0 && <span className="text-sm text-slate-400">No skills available.</span>}
                                        {profile.profile.skills.slice(0, 40).map((skill) => (
                                            <span key={skill} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </article>

                                <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{marketingCopy.publicProfile.projectsTitle}</h2>
                                    <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                        {profile.profile.projects.length === 0 && <p className="text-sm text-slate-400">No projects available.</p>}
                                        {profile.profile.projects.map((project, idx) => (
                                            <div key={`${project.name}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                                <h3 className="break-words font-semibold text-white">{project.name || "Project"}</h3>
                                                {project.role && <p className="break-words text-sm text-slate-300">{project.role}</p>}
                                                {project.summary && <p className="mt-2 break-words text-sm text-slate-300">{project.summary}</p>}
                                                {project.impact && <p className="mt-2 break-words text-sm text-slate-300">Outcome: {project.impact}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </article>

                                <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{marketingCopy.publicProfile.experienceTitle}</h2>
                                    <div className="mt-3 max-h-[420px] space-y-4 overflow-y-auto pr-1">
                                        {profile.profile.experience.length === 0 && <p className="text-sm text-slate-400">No experience entries found.</p>}
                                        {profile.profile.experience.map((item, idx) => (
                                            <div key={`${item.organization}-${item.role}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                    <h3 className="break-words font-semibold text-white">
                                                        {item.role || "Role"} {item.organization ? `@ ${item.organization}` : ""}
                                                    </h3>
                                                    <span className="text-xs text-slate-400">{formatRange(item.start, item.end)}</span>
                                                </div>
                                                {item.responsibilities.length > 0 && (
                                                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
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
                                className={`rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm lg:sticky lg:top-6 lg:block ${isMobileChatOpen ? "block" : "hidden"}`}
                            >
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Profile chatbot</h2>
                                <p className="mt-2 text-xs leading-relaxed text-slate-400">Questions about project work, role fit, and delivery evidence.</p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {smartPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => enqueueQuestion(prompt)}
                                            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:border-white/30"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="space-y-3">
                                        {messages.length === 0 && <p className="text-sm text-slate-400">No questions yet.</p>}
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                                <div
                                                    className={`max-w-[92%] break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                                        m.role === "user"
                                                            ? "rounded-br-md bg-gradient-to-r from-blue-500 to-violet-500 text-white"
                                                            : "rounded-bl-md border border-white/10 bg-white/[0.04] text-slate-100"
                                                    }`}
                                                >
                                                    {m.role === "assistant" ? (
                                                        <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5">
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
                                                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-400">Thinking...</div>
                                            </div>
                                        )}
                                        <div ref={bottomRef} />
                                    </div>
                                </div>

                                {error && profile && <p className="mt-3 text-xs text-rose-300">{error}</p>}

                                <div className="mt-3">
                                    <textarea
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder="Ask about project impact, skills, or role fit..."
                                        rows={2}
                                        className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-base text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none"
                                    />
                                    <button
                                        onClick={() => enqueueQuestion()}
                                        disabled={isTyping}
                                        className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        Send question
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
