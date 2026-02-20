"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type SessionUser = {
    id: string
    email: string
    name?: string | null
    cvToken?: string | null
}

export default function HomePage() {
    const [user, setUser] = useState<SessionUser | null>(null)

    useEffect(() => {
        async function loadSession() {
            try {
                const res = await fetch("/api/auth/me")
                if (!res.ok) return
                const data = await res.json()
                setUser(data.user ?? null)
            } catch {}
        }

        loadSession()
    }, [])

    const primaryHref = user?.cvToken ? `/cv/${user.cvToken}` : "/upload"

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <header className="mb-8 flex items-center justify-between rounded-lg border bg-white p-4">
                    <h1 className="text-lg font-semibold">CareerIndex</h1>
                    {!user ? (
                        <div className="flex gap-2">
                            <Link href="/auth?mode=login" className="rounded-md border px-3 py-2 text-sm">
                                Login
                            </Link>
                            <Link href="/auth?mode=register" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
                                Registrieren
                            </Link>
                        </div>
                    ) : (
                        <span className="text-sm text-slate-600">{user.name || user.email}</span>
                    )}
                </header>

                <section className="rounded-lg border bg-white p-6">
                    <h2 className="text-2xl font-semibold">Evidenzbasierte Karriereprofile fuer Tech-Studierende</h2>
                    <p className="mt-3 text-sm text-slate-700">
                        Lade CV-Daten hoch, erzeuge ein strukturiertes Profil und exportiere zwei recruiter-taugliche Ansichten:
                        Public Profile mit Chatbot und Pitch/PDF Seite.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link href={primaryHref} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                            {user?.cvToken ? "Zum Dashboard" : "Onboarding starten"}
                        </Link>
                        <Link href="/upload" className="rounded-md border px-4 py-2 text-sm font-medium">
                            Direkt zum Upload
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    )
}
