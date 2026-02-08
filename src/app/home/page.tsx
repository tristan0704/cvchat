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
    const primaryLabel = user?.cvToken ? "Go to my CV" : "Create CV chat"

    return (
        <main className="min-h-screen bg-white px-5 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-4xl">
                <header className="mb-16 sm:mb-24 flex items-center justify-between gap-4">
                    <span className="block text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
                        CVChat
                    </span>

                    {!user ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/auth?mode=login"
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:border-black"
                            >
                                Login
                            </Link>
                            <Link
                                href="/auth?mode=register"
                                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                            >
                                Register
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-gray-600">
                                Signed in as{" "}
                                <span className="font-medium text-gray-900">
                                    {user.name || user.email}
                                </span>
                            </p>
                            {user.cvToken && (
                                <Link
                                    href={`/cv/${user.cvToken}`}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:border-black"
                                >
                                    Direct to my CV
                                </Link>
                            )}
                        </div>
                    )}
                </header>

                <section className="mb-20 sm:mb-32">
                    <h1 className="text-4xl leading-tight sm:text-6xl sm:leading-tight font-semibold tracking-tight mb-6 sm:mb-10">
                        Make your application interactive
                    </h1>

                    <p className="text-lg sm:text-2xl text-gray-700 mb-6 sm:mb-10 max-w-2xl">
                        Turn your entire application into a private, shareable chat.
                    </p>

                    <p className="text-gray-600 leading-relaxed mb-10 sm:mb-14 max-w-2xl">
                        Recruiters don&apos;t need to read documents. They ask questions and get
                        precise answers based only on what you uploaded.
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Link
                            href={primaryHref}
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-black px-8 py-4 text-white font-medium hover:opacity-90 transition"
                        >
                            {primaryLabel}
                        </Link>

                        {!user ? (
                            <p className="text-sm text-gray-500 text-center sm:text-left">
                                No signup · No recruiter accounts
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500 text-center sm:text-left">
                                You are logged in. Jump straight to your CV.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}
