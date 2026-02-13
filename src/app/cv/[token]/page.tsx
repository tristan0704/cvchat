"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type CvMeta = { name: string; position: string; summary: string; imageUrl?: string | null }
type CvStatus = { isPublished: boolean; shareEnabled: boolean; shareToken: string | null; updatedAt: string; needsRepublish: boolean }
type CvResponse = { meta: CvMeta; status: CvStatus }
type AuthUser = { id: string; email: string; name?: string | null; publicSlug?: string | null }

export default function CvPage() {
    const params = useParams()
    const token = params.token as string

    const [meta, setMeta] = useState<CvMeta | null>(null)
    const [status, setStatus] = useState<CvStatus | null>(null)
    const [authUser, setAuthUser] = useState<AuthUser | null>(null)
    const [summaryDraft, setSummaryDraft] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [actionError, setActionError] = useState("")
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [notice, setNotice] = useState("")

    const loadData = useCallback(async () => {
        setLoading(true)
        setError("")
        try {
            const [cvRes, meRes] = await Promise.all([fetch(`/api/cv/${token}`), fetch("/api/auth/me")])
            const cvData = (await cvRes.json().catch(() => ({}))) as CvResponse & { error?: string }
            if (!cvRes.ok) {
                setError(cvData.error || "Could not load profile.")
                return
            }
            const meData = await meRes.json().catch(() => ({}))

            setMeta(cvData.meta)
            setStatus(cvData.status)
            setSummaryDraft(cvData.meta.summary || "")
            setAuthUser(meData.user ?? null)
        } catch {
            setError("Server not reachable.")
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        loadData()
    }, [loadData])

    const displayName = useMemo(() => {
        if (authUser?.name?.trim()) return authUser.name.trim()
        if (meta?.name?.trim()) return meta.name.trim()
        if (authUser?.email) return authUser.email.split("@")[0]
        return "there"
    }, [authUser?.name, authUser?.email, meta?.name])

    const personalUrl = useMemo(() => {
        if (typeof window === "undefined" || !authUser?.publicSlug) return ""
        return `${window.location.origin}/u/${authUser.publicSlug}`
    }, [authUser?.publicSlug])

    const pitchUrl = useMemo(() => {
        if (typeof window === "undefined" || !authUser?.publicSlug) return ""
        return `${window.location.origin}/u/${authUser.publicSlug}/pitch`
    }, [authUser?.publicSlug])

    function showNotice(message: string) {
        setNotice(message)
        window.setTimeout(() => setNotice(""), 2200)
    }

    async function runAction(id: string, fn: () => Promise<void>) {
        setActionLoading(id)
        setActionError("")
        try {
            await fn()
            await loadData()
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Action failed")
        } finally {
            setActionLoading(null)
        }
    }

    async function ensureShareEnabled() {
        if (!status) throw new Error("Status not loaded")

        if (!status.isPublished) {
            const publishRes = await fetch(`/api/cv/${token}/publish`, { method: "POST" })
            if (!publishRes.ok) throw new Error("Publish failed.")
        }

        if (!status.shareEnabled || !status.shareToken) {
            const shareRes = await fetch(`/api/cv/${token}/share/enable`, { method: "POST" })
            if (!shareRes.ok) throw new Error("Enable sharing failed.")
        }
    }

    async function copyPublicLink(kind: "personal" | "pitch") {
        const link = kind === "personal" ? personalUrl : pitchUrl
        if (!link) throw new Error("No public link available")
        await ensureShareEnabled()
        await navigator.clipboard.writeText(link)
        showNotice(kind === "personal" ? "Personal link copied" : "Pitch link copied")
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold tracking-tight text-gray-900">CareerIndex</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                            Owner Dashboard
                        </span>
                    </div>

                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Willkommen {displayName}</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Du hast hier zwei öffentliche Seiten: deine Personal-Seite und deine Pitch-Seite. Du kannst beide direkt öffnen und teilen.
                    </p>
                </header>

                {loading && <p className="text-sm text-gray-500">Loading profile...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                {!loading && meta && status && (
                    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-6">
                            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Profil</h2>
                                <div className="mt-4 flex gap-4">
                                    {meta.imageUrl ? (
                                        <img src={meta.imageUrl} alt={meta.name} className="h-16 w-16 rounded-xl object-cover" />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200">
                                            <span className="text-lg font-semibold text-gray-700">{meta.name?.[0] ?? "?"}</span>
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="break-words text-lg font-semibold text-gray-900">{meta.name}</p>
                                        <p className="break-words text-sm text-gray-700">{meta.position}</p>
                                        <p className="mt-2 text-sm text-gray-600">Zuletzt aktualisiert: {new Date(status.updatedAt).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</label>
                                    <textarea
                                        value={summaryDraft}
                                        onChange={(e) => setSummaryDraft(e.target.value)}
                                        rows={5}
                                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                                                showNotice("Summary saved")
                                            })
                                        }
                                        disabled={actionLoading === "saveSummary"}
                                        className="mt-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                        Save summary
                                    </button>
                                </div>
                            </article>

                            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Sharing Settings</h2>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className={`rounded-full px-2.5 py-1 ${status.isPublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                                        {status.isPublished ? "Published" : "Not published"}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-1 ${status.shareEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                                        {status.shareEnabled ? "Share enabled" : "Share disabled"}
                                    </span>
                                    {status.needsRepublish && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Needs republish</span>}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        onClick={() =>
                                            runAction("enableShare", async () => {
                                                await ensureShareEnabled()
                                                showNotice("Sharing enabled")
                                            })
                                        }
                                        disabled={!!actionLoading}
                                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                        Enable sharing
                                    </button>
                                    <button
                                        onClick={() =>
                                            runAction("disableShare", async () => {
                                                const res = await fetch(`/api/cv/${token}/share/disable`, { method: "POST" })
                                                if (!res.ok) throw new Error("Disabling share failed.")
                                                showNotice("Sharing disabled")
                                            })
                                        }
                                        disabled={!!actionLoading}
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
                                    >
                                        Disable sharing
                                    </button>
                                    <button
                                        onClick={() =>
                                            runAction("republish", async () => {
                                                const res = await fetch(`/api/cv/${token}/publish`, { method: "POST" })
                                                if (!res.ok) throw new Error("Republish failed.")
                                                showNotice("Published version updated")
                                            })
                                        }
                                        disabled={!!actionLoading}
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
                                    >
                                        Republish
                                    </button>
                                </div>
                            </article>
                        </div>

                        <div className="space-y-6">
                            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Personal-Seite</h2>
                                <p className="mt-2 text-sm text-gray-600">Recruiter-Landingpage mit Personal Branding und Chatbot.</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Link
                                        href={authUser?.publicSlug ? `/u/${authUser.publicSlug}` : "#"}
                                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                                    >
                                        Seite oeffnen
                                    </Link>
                                    <button
                                        onClick={() => runAction("copyPersonal", () => copyPublicLink("personal"))}
                                        disabled={!!actionLoading || !authUser?.publicSlug}
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
                                    >
                                        Link kopieren
                                    </button>
                                </div>
                                {personalUrl && <p className="mt-3 break-all text-xs text-gray-500">{personalUrl}</p>}
                            </article>

                            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Pitch-Seite (PDF Ersatz)</h2>
                                <p className="mt-2 text-sm text-gray-600">Case-Study Pitch Seite aus deinen vorhandenen Daten.</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Link
                                        href={authUser?.publicSlug ? `/u/${authUser.publicSlug}/pitch` : "#"}
                                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                                    >
                                        Seite oeffnen
                                    </Link>
                                    <button
                                        onClick={() => runAction("copyPitch", () => copyPublicLink("pitch"))}
                                        disabled={!!actionLoading || !authUser?.publicSlug}
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50"
                                    >
                                        Link kopieren
                                    </button>
                                </div>
                                {pitchUrl && <p className="mt-3 break-all text-xs text-gray-500">{pitchUrl}</p>}
                            </article>
                        </div>
                    </section>
                )}

                {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            </div>

            {notice && (
                <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg">
                    {notice}
                </div>
            )}
        </main>
    )
}

