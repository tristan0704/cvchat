"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type CvMeta = { name: string; position: string; summary: string; imageUrl?: string | null }
type CvStatus = { updatedAt: string; metaUpdatedAt: string }
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

    const loadData = useCallback(async () => {
        setLoading(true)
        setError("")
        try {
            const [cvRes, meRes] = await Promise.all([fetch(`/api/cv/${token}`), fetch("/api/auth/me")])
            const cvData = (await cvRes.json().catch(() => ({}))) as CvResponse & { error?: string }
            if (!cvRes.ok) {
                setError(cvData.error || "Profil konnte nicht geladen werden.")
                return
            }
            const meData = await meRes.json().catch(() => ({}))
            setMeta(cvData.meta)
            setStatus(cvData.status)
            setSummaryDraft(cvData.meta.summary || "")
            setAuthUser(meData.user ?? null)
        } catch {
            setError("Server nicht erreichbar.")
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
        return "User"
    }, [authUser?.name, authUser?.email, meta?.name])

    const personalUrl = useMemo(() => {
        if (typeof window === "undefined" || !authUser?.publicSlug) return ""
        return `${window.location.origin}/u/${authUser.publicSlug}`
    }, [authUser?.publicSlug])

    const pitchUrl = useMemo(() => {
        if (typeof window === "undefined" || !authUser?.publicSlug) return ""
        return `${window.location.origin}/u/${authUser.publicSlug}/pitch`
    }, [authUser?.publicSlug])

    async function saveSummary() {
        setActionError("")
        try {
            const res = await fetch(`/api/cv/${token}/meta`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ summary: summaryDraft }),
            })
            if (!res.ok) throw new Error("Summary speichern fehlgeschlagen")
            await loadData()
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Fehler")
        }
    }

    async function copyLink(link: string) {
        if (!link) return
        await navigator.clipboard.writeText(link)
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <header className="mb-6 rounded-lg border bg-white p-5">
                    <h1 className="text-xl font-semibold">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-700">Hallo {displayName}. Hier verwaltest du Profil und Exporte.</p>
                </header>

                {loading && <p className="text-sm text-slate-600">Lade Daten...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                {!loading && meta && status && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <section className="rounded-lg border bg-white p-5">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Profil</h2>
                            <div className="mt-3 flex items-start gap-3">
                                {meta.imageUrl ? (
                                    <img src={meta.imageUrl} alt={meta.name} className="h-14 w-14 rounded-md object-cover" />
                                ) : (
                                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-200 text-lg font-semibold">
                                        {meta.name?.[0] ?? "?"}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold">{meta.name}</p>
                                    <p className="text-sm text-slate-700">{meta.position}</p>
                                    <p className="mt-1 text-xs text-slate-500">Zuletzt aktualisiert: {new Date(status.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">Summary</label>
                            <textarea
                                value={summaryDraft}
                                onChange={(e) => setSummaryDraft(e.target.value)}
                                rows={5}
                                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                            />
                            <button onClick={saveSummary} className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                                Summary speichern
                            </button>
                            {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
                        </section>

                        <section className="rounded-lg border bg-white p-5">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Exporte</h2>
                            <div className="mt-3 space-y-4">
                                <div className="rounded-md border p-3">
                                    <p className="text-sm font-semibold">Public Profile + Chatbot</p>
                                    <div className="mt-2 flex gap-2">
                                        <Link href={authUser?.publicSlug ? `/u/${authUser.publicSlug}` : "#"} className="rounded-md border px-3 py-2 text-sm">
                                            Oeffnen
                                        </Link>
                                        <button onClick={() => copyLink(personalUrl)} className="rounded-md border px-3 py-2 text-sm">
                                            Link kopieren
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <p className="text-sm font-semibold">Pitch / PDF Seite</p>
                                    <div className="mt-2 flex gap-2">
                                        <Link href={authUser?.publicSlug ? `/u/${authUser.publicSlug}/pitch` : "#"} className="rounded-md border px-3 py-2 text-sm">
                                            Oeffnen
                                        </Link>
                                        <button onClick={() => copyLink(pitchUrl)} className="rounded-md border px-3 py-2 text-sm">
                                            Link kopieren
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-lg border border-yellow-300 bg-yellow-50 p-5 md:col-span-2">
                            <span className="inline-flex rounded bg-yellow-300 px-2 py-1 text-xs font-semibold">BAUSTELLE</span>
                            <h2 className="mt-3 text-sm font-semibold uppercase tracking-wide">Analyse & Scoring Layer</h2>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-md border border-yellow-300 bg-white p-3 text-sm">Skill Score nach Rollenprofil</div>
                                <div className="rounded-md border border-yellow-300 bg-white p-3 text-sm">Skill-Gap Analyse</div>
                                <div className="rounded-md border border-yellow-300 bg-white p-3 text-sm">Verbesserungsvorschlaege pro Gap</div>
                                <div className="rounded-md border border-yellow-300 bg-white p-3 text-sm">Jetzt-vs-Nach-Verbesserung Projektion</div>
                            </div>
                            <p className="mt-3 text-xs text-slate-700">
                                Diese Karte ist bewusst der Platz fuer den Kernnutzen eurer App: evidenzbasierte Analyse und konkrete Karriere-Optimierung.
                            </p>
                        </section>
                    </div>
                )}
            </div>
        </main>
    )
}
