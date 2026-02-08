"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type CvMeta = {
    name: string
    position: string
    summary: string
    imageUrl?: string | null
}

type AuthUser = {
    id: string
    email: string
    name?: string | null
}

type Message = {
    role: "user" | "assistant"
    content: string
}

export default function CvPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string

    // meta
    const [meta, setMeta] = useState<CvMeta | null>(null)

    // chat
    const [messages, setMessages] = useState<Message[]>([])
    const [question, setQuestion] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [error, setError] = useState("")

    // auth (optional)
    const [authUser, setAuthUser] = useState<AuthUser | null>(null)
    const [authMode, setAuthMode] = useState<"login" | "register">("login")
    const [authEmail, setAuthEmail] = useState("")
    const [authPassword, setAuthPassword] = useState("")
    const [authName, setAuthName] = useState("")
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState("")
    const [deleteLoading, setDeleteLoading] = useState(false)

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

    // load auth session
    useEffect(() => {
        async function loadAuth() {
            try {
                const res = await fetch("/api/auth/me")
                if (!res.ok) return
                const data = await res.json()
                setAuthUser(data.user ?? null)
            } catch {}
        }
        loadAuth()
    }, [])

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

    async function submitAuth() {
        if (!authEmail.trim() || !authPassword.trim()) {
            setAuthError("Bitte E-Mail und Passwort ausfüllen.")
            return
        }

        setAuthLoading(true)
        setAuthError("")

        try {
            const res = await fetch(`/api/auth/${authMode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: authEmail,
                    password: authPassword,
                    name: authMode === "register" ? authName : undefined,
                    token,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                setAuthError(data.error || "Login fehlgeschlagen.")
                return
            }

            setAuthUser(data.user)
            setAuthPassword("")
            setAuthError("")
        } catch {
            setAuthError("Server nicht erreichbar.")
        } finally {
            setAuthLoading(false)
        }
    }

    async function logout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" })
        } finally {
            setAuthUser(null)
        }
    }

    async function deleteAccountAndData() {
        const confirmed = window.confirm(
            "Willst du deinen Account und alle zugeordneten CV-Daten wirklich dauerhaft löschen?"
        )
        if (!confirmed) return

        setDeleteLoading(true)
        setAuthError("")

        try {
            const res = await fetch("/api/auth/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            })

            const data = await res.json()
            if (!res.ok) {
                setAuthError(data.error || "Löschen fehlgeschlagen.")
                return
            }

            setAuthUser(null)
            router.push("/home")
        } catch {
            setAuthError("Server nicht erreichbar.")
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <main className="h-screen flex flex-col bg-white overflow-hidden">

            {/* header */}
            {meta && (
                <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
                    <div className="mx-auto max-w-3xl px-6 py-3 flex gap-4 items-start">
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
            <section className="flex-1 overflow-y-auto mx-auto w-full max-w-3xl px-6 py-4 space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">
                            Account (optional)
                        </p>

                        {authUser ? (
                            <div className="flex items-center gap-3">
                                <p className="text-xs text-gray-600">
                                    Eingeloggt als{" "}
                                    <span className="font-medium text-gray-900">
                                        {authUser.name || authUser.email}
                                    </span>
                                </p>
                                <button
                                    onClick={deleteAccountAndData}
                                    disabled={deleteLoading}
                                    className="text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                                >
                                    {deleteLoading
                                        ? "Lösche..."
                                        : "Account + Daten löschen"}
                                </button>
                                <button
                                    onClick={logout}
                                    className="text-xs font-medium text-gray-700 hover:text-black"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAuthMode("login")}
                                    className={`text-xs font-medium ${
                                        authMode === "login"
                                            ? "text-black"
                                            : "text-gray-500 hover:text-black"
                                    }`}
                                >
                                    Login
                                </button>
                                <span className="text-gray-300">/</span>
                                <button
                                    onClick={() => setAuthMode("register")}
                                    className={`text-xs font-medium ${
                                        authMode === "register"
                                            ? "text-black"
                                            : "text-gray-500 hover:text-black"
                                    }`}
                                >
                                    Registrieren
                                </button>
                            </div>
                        )}
                    </div>

                    {!authUser && (
                        <div className="mt-3 space-y-2">
                            {authMode === "register" && (
                                <input
                                    value={authName}
                                    onChange={(e) => setAuthName(e.target.value)}
                                    placeholder="Name"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            )}

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    placeholder="E-Mail"
                                    type="email"
                                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                <input
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    placeholder="Passwort"
                                    type="password"
                                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                <button
                                    onClick={submitAuth}
                                    disabled={authLoading}
                                    className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    {authMode === "login" ? "Login" : "Registrieren"}
                                </button>
                            </div>

                            <p className="text-xs text-gray-500">
                                Du kannst alle Funktionen auch ohne Login nutzen.
                            </p>

                            {authError && (
                                <p className="text-xs text-red-600">
                                    {authError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

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
                <div className="mx-auto max-w-3xl px-6 py-3 flex gap-3 items-end">
          <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about experience, projects, skills…"
              rows={2}
              className="
              flex-1 resize-none
              rounded-md border border-gray-300
              px-4 py-2 text-sm
              min-h-[56px] max-h-24
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
