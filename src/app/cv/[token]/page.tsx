"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type CvMeta = {
    name: string
    position: string
    summary: string
    imageUrl?: string | null
}

type Message = {
    role: "user" | "assistant"
    content: string
}

export default function CvPage() {
    const params = useParams()
    const token = params.token as string

    // meta
    const [meta, setMeta] = useState<CvMeta | null>(null)

    // chat
    const [messages, setMessages] = useState<Message[]>([])
    const [question, setQuestion] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [error, setError] = useState("")

    // share
    const [copied, setCopied] = useState(false)

    // scroll
    const bottomRef = useRef<HTMLDivElement | null>(null)

    // load meta
    useEffect(() => {
        async function loadMeta() {
            try {
                const res = await fetch(`/api/cv/${token}`)
                if (res.ok) {
                    const data = await res.json()
                    setMeta(data)
                }
            } catch {}
        }
        loadMeta()
    }, [token])

    // auto scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isTyping])

    // send question
    async function askQuestion() {
        if (!question.trim()) return

        const currentQuestion = question

        setMessages((prev) => [
            ...prev,
            { role: "user", content: currentQuestion },
        ])

        setQuestion("")
        setIsTyping(true)
        setError("")

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, question: currentQuestion }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Something went wrong")
                setIsTyping(false)
                return
            }

            await new Promise((r) => setTimeout(r, 500))

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.answer },
            ])
        } catch {
            setError("Server not reachable")
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <main className="min-h-screen flex flex-col bg-white">

            {/* header */}
            {meta && (
                <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
                    <div className="mx-auto max-w-3xl px-6 py-5 flex gap-4 items-start">
                        {meta.imageUrl ? (
                            <img
                                src={meta.imageUrl}
                                alt={meta.name}
                                className="h-14 w-14 rounded-full object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {meta.name?.[0] ?? "?"}
                </span>
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">
                                {meta.name}
                            </p>
                            <p className="text-sm text-gray-500 mb-2">
                                {meta.position}
                            </p>
                            <div className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto pr-2">
                                {meta.summary}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                setCopied(true)
                                setTimeout(() => setCopied(false), 1600)
                            }}
                            className={`
                h-fit rounded-md px-4 py-2 text-sm font-medium border transition
                ${
                                copied
                                    ? "bg-green-600 border-green-600 text-white"
                                    : "bg-white border-gray-300 text-gray-800 hover:border-black"
                            }
              `}
                        >
                            {copied ? "Copied ✓" : "Share"}
                        </button>
                    </div>
                </header>
            )}

            {/* chat */}
            <section className="flex-1 overflow-y-auto mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`flex ${
                            m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                        <div
                            className={`
                max-w-[85%]
                rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${
                                m.role === "user"
                                    ? "bg-black text-white rounded-br-md"
                                    : "bg-gray-100 border border-gray-200 text-gray-800 rounded-bl-md"
                            }
              `}
                        >
                            {m.role === "assistant" ? (
                                <div
                                    className="
                    prose prose-sm prose-neutral
                    prose-p:my-2 prose-ul:my-2 prose-li:my-1
                    max-w-none
                  "
                                >
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
                        <div className="rounded-2xl rounded-bl-md bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-500 animate-pulse">
                            Typing…
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div ref={bottomRef} />
            </section>

            {/* sticky input */}
            <footer className="sticky bottom-0 z-20 border-t border-gray-200 bg-white">
                <div className="mx-auto max-w-3xl px-6 py-4 flex gap-3 items-end">
          <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about experience, projects, skills…"
              rows={2}
              className="
              flex-1 resize-none
              rounded-md border border-gray-300
              px-4 py-3 text-sm
              min-h-[56px] max-h-40
              focus:outline-none focus:ring-2 focus:ring-black
            "
          />

                    <button
                        onClick={askQuestion}
                        disabled={isTyping}
                        className="
              rounded-md bg-black px-6 py-3
              text-sm font-medium text-white
              disabled:opacity-50 disabled:cursor-not-allowed
            "
                    >
                        Ask
                    </button>
                </div>
            </footer>

        </main>
    )
}
