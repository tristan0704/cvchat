"use client"

import { useEffect, useRef, useState } from "react"
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
    "What projects are most relevant for this role?",
    "Which results are clearly measurable?",
    "What technologies does this candidate use in practice?",
    "What follow-up interview questions would you recommend?",
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
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState("")
    const bottomRef = useRef<HTMLDivElement | null>(null)

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
                    setError(data.error || "CV not found")
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
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isTyping])

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
            const data = await res.json()
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

    return (
        <main className="h-[100dvh] flex flex-col bg-gradient-to-b from-white to-gray-50 overflow-hidden">
            {meta && (
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
                    <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
                        <div className="mb-3 flex items-center justify-between">
                            <Link href="/home" className="text-sm font-semibold tracking-tight text-gray-900">
                                HowToReplAI
                            </Link>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                                Recruiter View
                            </span>
                        </div>

                        <div className="flex gap-3 items-start min-w-0">
                            {meta.imageUrl ? (
                                <img
                                    src={meta.imageUrl}
                                    alt={meta.name}
                                    className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-medium text-gray-700">
                                        {meta.name?.[0] ?? "?"}
                                    </span>
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{meta.name}</p>
                                <p className="text-sm text-gray-500 mb-2 truncate">{meta.position}</p>
                                <div className="text-sm text-gray-700 leading-relaxed line-clamp-3">{meta.summary}</div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Shared profile - {publishedAt ? new Date(publishedAt).toLocaleString() : "-"}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText(window.location.href)
                                showToast("Link copied")
                                await track("share_link_copied", { source: "public_cv" })
                            }}
                            className="mt-3 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                        >
                            Copy link
                        </button>
                    </div>
                </header>
            )}

            <section className="flex-1 overflow-y-auto mx-auto w-full max-w-3xl px-4 py-4 space-y-4 sm:px-6">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                    Responses are generated only from uploaded application documents.
                </div>

                {loading && <p className="text-sm text-gray-500">Loading profile...</p>}

                {messages.length === 0 && !loading && !error && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="text-sm font-medium text-gray-900">Suggested questions</p>
                        <div className="mt-3 grid gap-2">
                            {QUICK_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => askQuestion(prompt)}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-500"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed break-words ${
                                m.role === "user"
                                    ? "bg-black text-white rounded-br-md"
                                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                            }`}
                        >
                            {m.role === "assistant" ? (
                                <div className="prose prose-sm prose-neutral prose-p:my-2 prose-ul:my-2 prose-li:my-1 max-w-none break-words">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                m.content
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 text-sm text-gray-500 animate-pulse shadow-sm">
                            Thinking...
                        </div>
                    </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                <div ref={bottomRef} />
            </section>

            <footer className="sticky bottom-0 z-20 border-t border-gray-200 bg-white">
                <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <textarea
                            aria-label="Ask a question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask about experience, projects, skills..."
                            rows={2}
                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 min-h-[56px] max-h-24"
                        />
                        <button
                            aria-label="Send question"
                            onClick={() => askQuestion()}
                            disabled={isTyping || !meta}
                            className="rounded-lg bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Ask
                        </button>
                    </div>
                </div>
            </footer>

            {toast && (
                <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}
        </main>
    )
}
