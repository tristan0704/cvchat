"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type PublicMeta = {
    name: string
    position: string
    summary: string
    imageUrl?: string | null
}

type Message = {
    role: "user" | "assistant"
    content: string
}

const QUICK_PROMPTS = [
    "Which experiences are most relevant for this role?",
    "What measurable outcomes are documented?",
    "Which technologies are used in real projects?",
    "What are strong indicators of ownership and impact?",
    "What are good follow-up interview questions?",
]

export default function PublicCvPage() {
    const params = useParams()
    const shareToken = params.shareToken as string
    const chatStorageKey = `public-cv-chat-${shareToken}`

    const [meta, setMeta] = useState<PublicMeta | null>(null)
    const [publishedAt, setPublishedAt] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [question, setQuestion] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [error, setError] = useState("")
    const [queuedQuestions, setQueuedQuestions] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState("")
    const bottomRef = useRef<HTMLDivElement | null>(null)

    const smartPrompts = useMemo(() => {
        if (!meta?.position?.trim()) return QUICK_PROMPTS
        return [`How well does this profile match a ${meta.position} role?`, ...QUICK_PROMPTS.slice(1)]
    }, [meta?.position])

    function showToast(message: string) {
        setToast(message)
        window.setTimeout(() => setToast(""), 1800)
    }

    async function track(type: string, context?: unknown) {
        try {
            await fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, context }),
            })
        } catch {}
    }

    useEffect(() => {
        async function loadMeta() {
            setLoading(true)
            try {
                const res = await fetch(`/api/public-cv/${shareToken}`)
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                    setError(data.error || "Profile not found")
                    return
                }
                setMeta(data.meta)
                setPublishedAt(data.publishedAt ?? null)
                setError("")
            } catch {
                setError("Server not reachable")
            } finally {
                setLoading(false)
            }
        }
        loadMeta()
    }, [shareToken])

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
                body: JSON.stringify({ shareToken, question: nextQuestion }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data.error || "Something went wrong")
                return
            }
            setMessages((prev) => [...prev, { role: "assistant", content: data.answer }])
        } catch {
            setError("Server not reachable")
            await track("client_public_chat_error")
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
    }, [queuedQuestions, isTyping])

    return (
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto w-full max-w-4xl space-y-6">
                {meta && (
                    <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <Link href="/home" className="text-sm font-semibold tracking-tight text-gray-900">
                                CareerIndex
                            </Link>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                                Recruiter View
                            </span>
                        </div>

                        <div className="flex gap-3 items-start min-w-0">
                            {meta.imageUrl ? (
                                <img src={meta.imageUrl} alt={meta.name} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-medium text-gray-700">{meta.name?.[0] ?? "?"}</span>
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 break-words">{meta.name}</p>
                                <p className="text-sm text-gray-600 break-words">{meta.position}</p>
                                <p className="mt-2 text-sm text-gray-700 break-words">{meta.summary}</p>
                                <p className="mt-2 text-xs text-gray-500">Shared profile: {publishedAt ? new Date(publishedAt).toLocaleString() : "-"}</p>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText(window.location.href)
                                showToast("Link copied")
                                await track("share_link_copied", { source: "public_cv" })
                            }}
                            className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                        >
                            Copy link
                        </button>
                    </header>
                )}

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs text-gray-600">
                        CareerIndex helps recruiters understand a candidate profile faster and with better context.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {smartPrompts.map((prompt) => (
                            <button
                                key={prompt}
                                onClick={() => enqueueQuestion(prompt)}
                                className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-500"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 max-h-[52vh] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="space-y-3">
                            {loading && <p className="text-sm text-gray-500">Loading profile...</p>}
                            {!loading && messages.length === 0 && <p className="text-sm text-gray-500">No questions yet.</p>}

                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed break-words ${
                                            m.role === "user"
                                                ? "bg-black text-white rounded-br-md"
                                                : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                                        }`}
                                    >
                                        {m.role === "assistant" ? (
                                            <div className="prose prose-sm prose-neutral prose-p:my-2 prose-ul:my-2 prose-li:my-1 max-w-none break-words">
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
                                    <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 text-sm text-gray-500">
                                        Thinking...
                                    </div>
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>
                    </div>

                    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <textarea
                            aria-label="Ask a question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask about experience, projects, skills..."
                            rows={2}
                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 text-base min-h-[56px]"
                        />
                        <button
                            aria-label="Send question"
                            onClick={() => enqueueQuestion()}
                            disabled={isTyping || !meta}
                            className="rounded-lg bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Ask
                        </button>
                    </div>
                </section>
            </div>

            {toast && (
                <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}
        </main>
    )
}
