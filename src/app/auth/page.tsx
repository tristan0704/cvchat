"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

type AuthUser = {
    id: string
    email: string
    name?: string | null
    cvToken?: string | null
}

function AuthPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = useMemo(
        () => (searchParams.get("mode") === "register" ? "register" : "login"),
        [searchParams]
    )

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        async function redirectIfLoggedIn() {
            try {
                const res = await fetch("/api/auth/me")
                if (!res.ok) return
                const data = (await res.json()) as { user: AuthUser | null }
                if (!data.user) return
                router.push(data.user.cvToken ? `/cv/${data.user.cvToken}` : "/upload")
            } catch {}
        }

        redirectIfLoggedIn()
    }, [router])

    async function submit() {
        if (!email.trim() || !password.trim()) {
            setError("Please enter email and password.")
            return
        }

        setLoading(true)
        setError("")

        try {
            const res = await fetch(`/api/auth/${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    name: mode === "register" ? name : undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                setError(data.error || "Authentication failed.")
                return
            }

            const meRes = await fetch("/api/auth/me")
            const meData = (await meRes.json()) as { user: AuthUser | null }
            const cvToken = meData.user?.cvToken

            router.push(cvToken ? `/cv/${cvToken}` : "/upload")
        } catch {
            setError("Server not reachable.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto w-full max-w-md">
                <header className="mb-8 flex items-center justify-between">
                    <Link href="/home" className="text-lg font-semibold tracking-tight text-gray-900">
                        HowToReplAI
                    </Link>
                    <Link
                        href="/home"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
                    >
                        Back
                    </Link>
                </header>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                        {mode === "login" ? "Welcome back" : "Create your account"}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        {mode === "login"
                            ? "Sign in to manage and revisit your CV chat."
                            : "Sign up to save your CV chat and manage sharing."}
                    </p>

                    <div className="mt-6 space-y-3">
                        {mode === "register" && (
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name (optional)"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                            />
                        )}

                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            type="email"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3"
                        />

                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            type="password"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3"
                        />

                        <button
                            onClick={submit}
                            disabled={loading}
                            className="w-full rounded-lg bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
                        >
                            {loading
                                ? "Please wait..."
                                : mode === "login"
                                  ? "Log in"
                                  : "Create account"}
                        </button>

                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                </section>
            </div>
        </main>
    )
}

export default function AuthPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-8 sm:px-6 sm:py-12" />}>
            <AuthPageContent />
        </Suspense>
    )
}
