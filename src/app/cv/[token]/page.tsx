"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type CvMeta = { name: string; position: string; summary: string; imageUrl?: string | null }
type CvProfile = {
    skills: string[]
    experience: { organization: string; role: string; start: string; end: string; responsibilities: string[]; keywords: string[] }[]
    projects: { name: string; role: string; summary: string; impact: string; tech: string[] }[]
}
type CvStatus = { isPublished: boolean; shareEnabled: boolean; shareToken: string | null; updatedAt: string; needsRepublish: boolean }
type CvResponse = { meta: CvMeta; profile: CvProfile; status: CvStatus }
type AuthUser = { publicSlug?: string | null }
type Message = { role: "user" | "assistant"; content: string }

const QUICK_PROMPTS = [
    "Welche Skills sind fuer Backend-Rollen am relevantesten?",
    "Welche Erfahrungen zeigen Ownership und Verantwortung?",
    "Welche Technologien wurden in echten Projekten eingesetzt?",
    "Welche messbaren Ergebnisse sind dokumentiert?",
]

function formatRange(start: string, end: string) {
    if (!start && !end) return ""
    if (start && end) return `${start} - ${end}`
    return start || end
}

export default function CvPage() {
    const params = useParams()
    const token = params.token as string
    const chatStorageKey = `cv-chat-${token}`

    const [meta, setMeta] = useState<CvMeta | null>(null)
    const [profile, setProfile] = useState<CvProfile | null>(null)
    const [status, setStatus] = useState<CvStatus | null>(null)
    const [authUser, setAuthUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [messages, setMessages] = useState<Message[]>([])
    const [question, setQuestion] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [queuedQuestions, setQueuedQuestions] = useState<string[]>([])
    const bottomRef = useRef<HTMLDivElement | null>(null)

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [summaryDraft, setSummaryDraft] = useState("")
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [actionError, setActionError] = useState("")
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(true)

    const shareUrl = useMemo(() => {
        if (typeof window === "undefined") return null
        if (authUser?.publicSlug) return `${window.location.origin}/u/${authUser.publicSlug}`
        if (status?.shareToken) return `${window.location.origin}/cv/share/${status.shareToken}`
        return null
    }, [authUser?.publicSlug, status?.shareToken])

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [cvRes, meRes] = await Promise.all([fetch(`/api/cv/${token}`), fetch("/api/auth/me")])
                const cvData = (await cvRes.json().catch(() => ({}))) as CvResponse & { error?: string }
                if (!cvRes.ok) {
                    setError(cvData.error || "Could not load CV.")
                    return
                }
                setMeta(cvData.meta)
                setProfile(cvData.profile)
                setStatus(cvData.status)
                setSummaryDraft(cvData.meta.summary || "")
                const meData = await meRes.json().catch(() => ({}))
                setAuthUser(meData.user ?? null)
                setError("")
            } catch {
                setError("Server not reachable.")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [token])

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
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isTyping, isMobileChatOpen])

    useEffect(() => {
        if (!isMobileChatOpen) return
        if (!window.matchMedia("(max-width: 1023px)").matches) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [isMobileChatOpen])

    async function runAction(id: string, fn: () => Promise<void>) {
        setActionLoading(id)
        setActionError("")
        try {
            await fn()
            window.location.reload()
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Action failed")
        } finally {
            setActionLoading(null)
        }
    }

    async function askQuestion(raw?: string) {
        const next = (raw ?? question).trim()
        if (!next) return
        setMessages((prev) => [...prev, { role: "user", content: next }])
        setQuestion("")
        setIsTyping(true)
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, question: next }),
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
        const next = (raw ?? question).trim()
        if (!next) return
        setQueuedQuestions((prev) => [...prev, next])
        if (!raw) setQuestion("")
    }

    useEffect(() => {
        if (isTyping || queuedQuestions.length === 0) return
        const [next, ...rest] = queuedQuestions
        setQueuedQuestions(rest)
        askQuestion(next)
    }, [isTyping, queuedQuestions])

    function ChatBody() {
        return (
            <>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => enqueueQuestion(prompt)}
                            className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-500"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
                <div className="mt-4 h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:h-[420px]">
                    <div className="space-y-3">
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
                                        <div className="prose prose-sm prose-neutral max-w-none overflow-x-auto prose-p:my-1.5 prose-pre:overflow-x-auto">
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
                <div className="mt-3">
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask about skills, experience, projects..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                        onClick={() => enqueueQuestion()}
                        disabled={isTyping}
                        className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        Ask question
                    </button>
                </div>
            </>
        )
    }

    function MobileChatBody() {
        return (
            <div className="flex h-full min-h-0 flex-col p-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => enqueueQuestion(prompt)}
                            className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-500"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="space-y-3">
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
                                        <div className="prose prose-sm prose-neutral max-w-none overflow-x-auto prose-p:my-1.5 prose-pre:overflow-x-auto">
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

                <div className="mt-3 border-t border-slate-200 pt-3">
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask about skills, experience, projects..."
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                        onClick={() => enqueueQuestion()}
                        disabled={isTyping}
                        className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        Ask question
                    </button>
                </div>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-10">
                {meta && status && (
                    <header className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-8">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold tracking-tight text-slate-900">CVChat</p>
                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">Owner View</span>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 sm:w-auto"
                                >
                                    Open settings
                                </button>
                            </div>
                        </div>
                        <div className="grid min-w-0 gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
                            {meta.imageUrl ? (
                                <img src={meta.imageUrl} alt={meta.name} className="h-20 w-20 rounded-2xl object-cover" />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200">
                                    <span className="text-2xl font-semibold text-slate-700">{meta.name?.[0] ?? "?"}</span>
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{meta.name}</h1>
                                <p className="mt-1 break-words text-base text-emerald-700">{meta.position}</p>
                                <p className="mt-3 max-w-3xl break-words text-sm leading-relaxed text-slate-600">{meta.summary}</p>
                            </div>
                        </div>
                    </header>
                )}

                {loading && <p className="mt-6 text-sm text-slate-500">Loading profile...</p>}
                {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

                {profile && (
                    <section className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[1.3fr_1fr]">
                        <div className="min-w-0 space-y-6">
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Skills</h2>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {profile.skills.map((skill) => (
                                        <span key={skill} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Experience</h2>
                                <div className="mt-3 space-y-4">
                                    {profile.experience.map((item, idx) => (
                                        <div key={`${item.organization}-${idx}`} className="min-w-0 rounded-xl border border-slate-200 p-4">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <h3 className="break-words font-semibold text-slate-900">
                                                    {item.role} {item.organization ? `@ ${item.organization}` : ""}
                                                </h3>
                                                <span className="text-xs text-slate-500">{formatRange(item.start, item.end)}</span>
                                            </div>
                                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                                {item.responsibilities.slice(0, 5).map((task) => (
                                                    <li key={task} className="break-words">
                                                        {task}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Projects</h2>
                                <div className="mt-3 space-y-3">
                                    {profile.projects.map((project, idx) => (
                                        <div key={`${project.name}-${idx}`} className="min-w-0 rounded-xl border border-slate-200 p-4">
                                            <h3 className="break-words font-semibold text-slate-900">{project.name || "Project"}</h3>
                                            {project.role && <p className="break-words text-sm text-emerald-700">{project.role}</p>}
                                            {project.summary && <p className="mt-2 break-words text-sm text-slate-700">{project.summary}</p>}
                                        </div>
                                    ))}
                                </div>
                            </article>
                        </div>

                        <aside className="hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Recruiter Chat</h2>
                            <ChatBody />
                        </aside>
                    </section>
                )}
            </div>

            {profile && (
                <div
                    className={`fixed z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden ${
                        isMobileChatOpen ? "inset-0 bg-slate-900/20 pt-20" : "inset-x-0 bottom-0"
                    }`}
                >
                    {!isMobileChatOpen && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsMobileChatOpen(true)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-lg"
                            >
                                <span>Chat</span>
                                <span aria-hidden="true">?</span>
                            </button>
                        </div>
                    )}
                    {isMobileChatOpen && (
                        <div className="ml-auto flex h-[min(66dvh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Recruiter Chat</h2>
                                <button
                                    onClick={() => setIsMobileChatOpen(false)}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                                >
                                    Close
                                </button>
                            </div>
                            <MobileChatBody />
                        </div>
                    )}
                </div>
            )}

            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-6 sm:px-6 sm:py-8" onClick={() => setIsSettingsOpen(false)}>
                    <div className="mx-auto max-h-[calc(100dvh-3rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-slate-900">Owner settings</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                                Close
                            </button>
                        </div>
                        <section className="mt-4 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-semibold text-slate-900">Public share</h3>
                            {shareUrl && <p className="mt-2 break-all text-xs text-slate-500">{shareUrl}</p>}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    onClick={() =>
                                        runAction("copyShare", async () => {
                                            if (!status?.isPublished) {
                                                const publishRes = await fetch(`/api/cv/${token}/publish`, { method: "POST" })
                                                if (!publishRes.ok) throw new Error("Publish failed.")
                                            }
                                            if (!status?.shareEnabled || !status?.shareToken) {
                                                const shareRes = await fetch(`/api/cv/${token}/share/enable`, { method: "POST" })
                                                if (!shareRes.ok) throw new Error("Enable sharing failed.")
                                            }
                                            await navigator.clipboard.writeText(shareUrl || "")
                                        })
                                    }
                                    disabled={!!actionLoading}
                                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    Copy share link
                                </button>
                                {status?.shareEnabled && (
                                    <button
                                        onClick={() =>
                                            runAction("stopSharing", async () => {
                                                const res = await fetch(`/api/cv/${token}/share/disable`, { method: "POST" })
                                                if (!res.ok) throw new Error("Stopping share failed.")
                                            })
                                        }
                                        disabled={!!actionLoading}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
                                    >
                                        Stop sharing
                                    </button>
                                )}
                                {status?.needsRepublish && (
                                    <button
                                        onClick={() =>
                                            runAction("republish", async () => {
                                                const res = await fetch(`/api/cv/${token}/publish`, { method: "POST" })
                                                if (!res.ok) throw new Error("Republish failed.")
                                            })
                                        }
                                        disabled={!!actionLoading}
                                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 disabled:opacity-50"
                                    >
                                        Update shared version
                                    </button>
                                )}
                            </div>
                        </section>
                        <section className="mt-4 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-semibold text-slate-900">Profile summary</h3>
                            <textarea
                                value={summaryDraft}
                                onChange={(e) => setSummaryDraft(e.target.value)}
                                rows={5}
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                            <button
                                onClick={() =>
                                    runAction("saveSummary", async () => {
                                        const res = await fetch(`/api/cv/${token}/meta`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ summary: summaryDraft }),
                                        })
                                        if (!res.ok) throw new Error("Saving summary failed.")
                                    })
                                }
                                disabled={actionLoading === "saveSummary"}
                                className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                Save summary
                            </button>
                        </section>
                        {actionError && <p className="mt-3 text-xs text-red-600">{actionError}</p>}
                    </div>
                </div>
            )}
        </main>
    )
}
