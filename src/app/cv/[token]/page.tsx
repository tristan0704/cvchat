"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type CvMeta = {
    name: string
    position: string
    summary: string
    imageUrl?: string | null
}

type CvStatus = {
    isPublished: boolean
    shareEnabled: boolean
    shareToken: string | null
    publishedAt: string | null
    updatedAt: string
    needsRepublish: boolean
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

type CvResponse = {
    meta: CvMeta
    status: CvStatus
}

const DEFAULT_QUICK_PROMPTS = [
    "What are the strongest skills for this role?",
    "Summarize role-relevant project experience in 5 bullets.",
    "Which achievements are measurable in the documents?",
    "Where are potential gaps and how can they be addressed?",
    "Which interview questions should I ask next?",
]

export default function CvPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string
    const chatStorageKey = `cv-chat-${token}`

    const [meta, setMeta] = useState<CvMeta | null>(null)
    const [status, setStatus] = useState<CvStatus | null>(null)
    const [pageError, setPageError] = useState("")
    const [isPageLoading, setIsPageLoading] = useState(true)

    const [messages, setMessages] = useState<Message[]>([])
    const [question, setQuestion] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [chatError, setChatError] = useState("")
    const [queuedQuestions, setQueuedQuestions] = useState<string[]>([])

    const [authUser, setAuthUser] = useState<AuthUser | null>(null)
    const [authMode, setAuthMode] = useState<"login" | "register">("login")
    const [authEmail, setAuthEmail] = useState("")
    const [authPassword, setAuthPassword] = useState("")
    const [authName, setAuthName] = useState("")
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState("")
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [summaryDraft, setSummaryDraft] = useState("")
    const [isEditingSummary, setIsEditingSummary] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [actionError, setActionError] = useState("")
    const [toast, setToast] = useState("")

    const bottomRef = useRef<HTMLDivElement | null>(null)

    const shareUrl = useMemo(() => {
        if (!status?.shareToken || typeof window === "undefined") return null
        return `${window.location.origin}/cv/share/${status.shareToken}`
    }, [status?.shareToken])

    const quickPrompts = useMemo(() => {
        if (!meta?.position?.trim()) return DEFAULT_QUICK_PROMPTS
        return [
            `How well does the candidate fit a ${meta.position} role?`,
            ...DEFAULT_QUICK_PROMPTS.slice(1),
        ]
    }, [meta?.position])

    async function track(type: string, context?: unknown) {
        try {
            await fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, cvToken: token, context }),
            })
        } catch {}
    }

    function showToast(message: string) {
        setToast(message)
        window.setTimeout(() => setToast(""), 1800)
    }

    async function refreshCv() {
        setIsPageLoading(true)
        try {
            const res = await fetch(`/api/cv/${token}`)
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setPageError(data.error || "Could not load CV.")
                return
            }
            const data = (await res.json()) as CvResponse
            setMeta(data.meta)
            setStatus(data.status)
            setSummaryDraft(data.meta.summary)
            setPageError("")
        } catch {
            setPageError("Server not reachable.")
        } finally {
            setIsPageLoading(false)
        }
    }

    useEffect(() => {
        refreshCv()
    }, [token])

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

    async function runAction(actionId: string, fn: () => Promise<void>) {
        setActionLoading(actionId)
        setActionError("")
        try {
            await fn()
            await refreshCv()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Action failed."
            setActionError(message)
            await track("client_action_error", { actionId, message })
        } finally {
            setActionLoading(null)
        }
    }

    async function askQuestion(raw?: string) {
        const nextQuestion = (raw ?? question).trim()
        if (!nextQuestion) return
        setMessages((prev) => [...prev, { role: "user", content: nextQuestion }])
        setQuestion("")
        setIsTyping(true)
        setChatError("")

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, question: nextQuestion }),
            })
            const data = await res.json()
            if (!res.ok) {
                setChatError(data.error || "Something went wrong")
                return
            }
            setMessages((prev) => [...prev, { role: "assistant", content: data.answer }])
        } catch {
            setChatError("Server not reachable")
            await track("client_chat_error")
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
        if (isTyping) return
        if (queuedQuestions.length === 0) return
        const [next, ...rest] = queuedQuestions
        setQueuedQuestions(rest)
        askQuestion(next)
    }, [queuedQuestions, isTyping])

    async function updateSharedVersion() {
        await runAction("updateSharedVersion", async () => {
            const res = await fetch(`/api/cv/${token}/publish`, { method: "POST" })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || "Publish failed.")
            }
            showToast("Shared version updated")
        })
    }

    async function stopSharing() {
        await runAction("stopSharing", async () => {
            const res = await fetch(`/api/cv/${token}/share/disable`, { method: "POST" })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || "Stopping share failed.")
            }
            showToast("Sharing stopped")
        })
    }

    async function copyShareLink() {
        await runAction("copyShare", async () => {
            if (!status?.isPublished) {
                const publishRes = await fetch(`/api/cv/${token}/publish`, { method: "POST" })
                if (!publishRes.ok) {
                    const data = await publishRes.json().catch(() => ({}))
                    throw new Error(data.error || "Publish before sharing failed.")
                }
            }

            let nextShareToken = status?.shareToken
            if (!status?.shareEnabled || !nextShareToken) {
                const enableRes = await fetch(`/api/cv/${token}/share/enable`, { method: "POST" })
                const enableData = await enableRes.json().catch(() => ({}))
                if (!enableRes.ok) {
                    throw new Error(enableData.error || "Enabling sharing failed.")
                }
                nextShareToken = enableData.shareToken
            }

            if (!nextShareToken) {
                throw new Error("No share link available.")
            }

            const url = `${window.location.origin}/cv/share/${nextShareToken}`
            await navigator.clipboard.writeText(url)
            showToast("Share link copied")
            await track("share_link_copied", { source: "internal_cv" })
        })
    }

    async function saveSummary() {
        await runAction("saveSummary", async () => {
            const res = await fetch(`/api/cv/${token}/meta`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ summary: summaryDraft }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || "Saving summary failed.")
            }
            setMeta((prev) => (prev ? { ...prev, summary: data.summary } : prev))
            setIsEditingSummary(false)
            showToast("Summary updated")
        })
    }

    async function submitAuth() {
        if (!authEmail.trim() || !authPassword.trim()) {
            setAuthError("Please enter email and password.")
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
                setAuthError(data.error || "Login failed.")
                return
            }
            setAuthUser(data.user)
            setAuthPassword("")
            setAuthError("")
            showToast("Account linked")
            await refreshCv()
        } catch {
            setAuthError("Server not reachable.")
        } finally {
            setAuthLoading(false)
        }
    }

    async function logout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" })
            showToast("Logged out")
        } finally {
            setAuthUser(null)
            setIsSettingsOpen(false)
        }
    }

    async function deleteAccountAndData() {
        const confirmed = window.confirm(
            "Delete your account and all linked CV data permanently?"
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
                setAuthError(data.error || "Delete failed.")
                return
            }
            setAuthUser(null)
            router.push("/home")
        } catch {
            setAuthError("Server not reachable.")
        } finally {
            setDeleteLoading(false)
        }
    }

    if (pageError) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-16 sm:px-6">
                <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{pageError}</p>
                </div>
            </main>
        )
    }

    return (
        <main className="h-[100dvh] flex flex-col bg-gradient-to-b from-white to-gray-50 overflow-hidden">
            {meta && status && (
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
                    <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
                        <div className="flex items-start gap-3 min-w-0">
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
                                <p className="text-sm text-gray-500 truncate">{meta.position}</p>
                                {isEditingSummary ? (
                                    <div className="mt-2 space-y-2">
                                        <textarea
                                            aria-label="Summary"
                                            value={summaryDraft}
                                            onChange={(e) => setSummaryDraft(e.target.value)}
                                            rows={4}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={saveSummary}
                                                disabled={actionLoading === "saveSummary"}
                                                className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSummaryDraft(meta.summary)
                                                    setIsEditingSummary(false)
                                                }}
                                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-800"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-gray-700 leading-relaxed line-clamp-3">
                                        {meta.summary}
                                    </p>
                                )}
                                <p className="mt-2 text-xs text-gray-500">
                                    {status.shareEnabled ? "Sharing is active" : "Not sharing"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                aria-label="Copy share link"
                                onClick={copyShareLink}
                                disabled={!!actionLoading}
                                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                Copy share link
                            </button>
                            {!isEditingSummary && (
                                <button
                                    aria-label="Edit summary"
                                    onClick={() => setIsEditingSummary(true)}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
                                >
                                    Edit summary
                                </button>
                            )}
                            {status.shareEnabled && (
                                <button
                                    aria-label="Stop sharing"
                                    onClick={stopSharing}
                                    disabled={!!actionLoading}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
                                >
                                    Stop sharing
                                </button>
                            )}
                            <button
                                aria-label="Open settings"
                                onClick={() => setIsSettingsOpen(true)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
                            >
                                Settings
                            </button>
                        </div>

                        {status.needsRepublish && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                                <span>Summary changed. Update the shared version.</span>
                                <button
                                    onClick={updateSharedVersion}
                                    disabled={!!actionLoading}
                                    className="rounded-lg border border-amber-300 px-2 py-1 font-medium disabled:opacity-50"
                                >
                                    Update shared version
                                </button>
                            </div>
                        )}

                        {shareUrl && status.shareEnabled && (
                            <p className="mt-2 text-xs text-gray-500 break-all">Public URL: {shareUrl}</p>
                        )}
                        {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}
                    </div>
                </header>
            )}

            <section className="flex-1 overflow-y-auto mx-auto w-full max-w-3xl px-4 py-4 space-y-4 sm:px-6">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                    Answers are generated only from uploaded documents and notes.
                </div>

                {!authUser && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-900">Save and manage this CV</p>
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
                                    Register
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 space-y-2">
                            {authMode === "register" && (
                                <input
                                    aria-label="Name"
                                    value={authName}
                                    onChange={(e) => setAuthName(e.target.value)}
                                    placeholder="Name"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                />
                            )}
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    aria-label="Email"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    placeholder="Email"
                                    type="email"
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                                />
                                <input
                                    aria-label="Password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    placeholder="Password"
                                    type="password"
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                                />
                                <button
                                    onClick={submitAuth}
                                    disabled={authLoading}
                                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    {authMode === "login" ? "Login" : "Register"}
                                </button>
                            </div>
                            {authError && <p className="text-xs text-red-600">{authError}</p>}
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-900">Smart question ideas</p>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {quickPrompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => enqueueQuestion(prompt)}
                                    className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-500"
                                >
                                    {prompt}
                            </button>
                        ))}
                    </div>
                </div>

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

                {chatError && <p className="text-sm text-red-600">{chatError}</p>}
                {isPageLoading && <p className="text-sm text-gray-500">Loading profile...</p>}
                <div ref={bottomRef} />
            </section>

            <footer className="sticky bottom-0 z-20 border-t border-gray-200 bg-white">
                <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
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
                            onClick={() => enqueueQuestion()}
                            disabled={isTyping}
                            className="rounded-lg bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Ask
                        </button>
                    </div>
                </div>
            </footer>

            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 bg-black/35 px-4 py-8 sm:px-6" onClick={() => setIsSettingsOpen(false)}>
                    <div
                        className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900">Settings</h2>
                            <button
                                aria-label="Close settings"
                                onClick={() => setIsSettingsOpen(false)}
                                className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700"
                            >
                                Close
                            </button>
                        </div>

                        {authUser ? (
                            <div className="mt-4 space-y-3">
                                <p className="text-sm text-gray-600">
                                    Signed in as <span className="font-medium text-gray-900">{authUser.name || authUser.email}</span>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={logout}
                                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800"
                                    >
                                        Logout
                                    </button>
                                    <button
                                        onClick={deleteAccountAndData}
                                        disabled={deleteLoading}
                                        className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                                    >
                                        {deleteLoading ? "Deleting..." : "Delete account"}
                                    </button>
                                </div>
                                {authError && <p className="text-xs text-red-600">{authError}</p>}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-gray-600">No account linked to this CV.</p>
                        )}
                    </div>
                </div>
            )}

            {toast && (
                <div className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}
        </main>
    )
}
