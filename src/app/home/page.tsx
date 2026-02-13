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
    const primaryLabel = user?.cvToken ? "Open my CareerIndex Hub" : "Create CareerIndex Hub"

    return (
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto w-full max-w-5xl">
                <header className="mb-12 flex items-center justify-between gap-3">
                    <Link href="/home" className="text-lg font-semibold tracking-tight text-gray-900">
                        CareerIndex
                    </Link>

                    {!user ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/auth?mode=login"
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/auth?mode=register"
                                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                            >
                                Sign up
                            </Link>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                            Signed in as <span className="font-medium text-gray-900">{user.name || user.email}</span>
                        </div>
                    )}
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                        <p className="mb-4 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                            Job-specific pitch platform
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                            Build a custom pitch per job and a personal page that converts
                        </h1>
                        <p className="mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
                            CareerIndex fasst deine Skills und Projekte in klare Storys zusammen und leitet Recruiter auf deine Personalpage. So verbringen sie mehr Zeit mit deiner Bewerbung und du faellst staerker auf.
                        </p>

                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={primaryHref}
                                className="inline-flex items-center justify-center rounded-lg bg-black px-6 py-3 text-sm font-medium text-white"
                            >
                                {primaryLabel}
                            </Link>
                            <Link
                                href="/upload"
                                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-800"
                            >
                                Upload documents
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                        <h2 className="text-lg font-semibold text-gray-900">How CareerIndex works</h2>
                        <ol className="mt-4 space-y-3 text-sm text-gray-600">
                            <li>1. Upload CV and optional supporting docs.</li>
                            <li>2. CareerIndex strukturiert Skills, Projekte und Nachweise.</li>
                            <li>3. You get a Personal page plus a Pitch page (PDF replacement).</li>
                            <li>4. Share both links directly in applications.</li>
                        </ol>

                        {!user && (
                            <p className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                Start free. You can publish and share both pages whenever you are ready.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}
