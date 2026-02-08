"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
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
        <main className="min-h-screen bg-white px-6 py-20">
            <div className="mx-auto max-w-md">
                <h1 className="text-3xl font-semibold mb-3">
                    {mode === "login" ? "Login" : "Register"}
                </h1>
                <p className="text-gray-600 mb-8">
                    {mode === "login"
                        ? "Log in and continue to your CV."
                        : "Create your account and continue to your CV."}
                </p>

                <div className="space-y-3">
                    {mode === "register" && (
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name (optional)"
                            className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    )}

                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />

                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        type="password"
                        className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="w-full rounded-md bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "login"
                              ? "Login"
                              : "Register"}
                    </button>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
            </div>
        </main>
    )
}

export default function AuthPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-white px-6 py-20" />}>
            <AuthPageContent />
        </Suspense>
    )
}
