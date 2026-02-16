"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { marketingCopy } from "@/lib/marketingCopy"

type AuthUser = {
    id: string
    email: string
    name?: string | null
    cvToken?: string | null
}

function AuthPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = useMemo(() => (searchParams.get("mode") === "register" ? "register" : "login"), [searchParams])

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
        <main className="min-h-screen bg-[#020817] text-slate-100">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(59,130,246,0.16),transparent_36%),radial-gradient(circle_at_86%_20%,rgba(139,92,246,0.16),transparent_42%),linear-gradient(180deg,#020617_0%,#040B1E_45%,#030514_100%)]" />
            </div>

            <div className="mx-auto w-full max-w-md px-4 pb-16 pt-6 sm:px-6 md:pt-8">
                <header className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-[#050C22]/80 px-4 py-3 backdrop-blur-md md:px-5">
                    <Link href="/home" className="inline-flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-semibold text-white">CI</span>
                        <span className="text-base font-semibold tracking-tight text-white">CareerIndex</span>
                    </Link>
                    <Link href="/home" className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
                        Back
                    </Link>
                </header>

                <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-7">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                        {mode === "login" ? marketingCopy.auth.loginTitle : marketingCopy.auth.registerTitle}
                    </h1>
                    <p className="mt-2 text-sm text-slate-300">
                        {mode === "login" ? marketingCopy.auth.loginText : marketingCopy.auth.registerText}
                    </p>

                    <div className="mt-6 space-y-3">
                        {mode === "register" && (
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name (optional)"
                                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none"
                            />
                        )}

                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            type="email"
                            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none"
                        />

                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            type="password"
                            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none"
                        />

                        <button
                            onClick={submit}
                            disabled={loading}
                            className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(76,105,255,0.3)] transition hover:brightness-110 disabled:opacity-50"
                        >
                            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
                        </button>

                        {error && <p className="text-sm text-rose-300">{error}</p>}
                    </div>
                </section>
            </div>
        </main>
    )
}

export default function AuthPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-[#020817]" />}>
            <AuthPageContent />
        </Suspense>
    )
}
