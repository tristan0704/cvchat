"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { marketingCopy } from "@/lib/marketingCopy"

type SessionUser = {
    id: string
    email: string
    name?: string | null
    cvToken?: string | null
}

const liveFeatures = [
    {
        title: "Project Signal Intake",
        description: "Capture repo links, your role, stack, and problem-solution context in one structured flow.",
        href: "/upload",
        label: "Live",
        icon: "PI",
    },
    {
        title: "AI Career Asset Drafting",
        description: "Generate recruiter-ready summaries and interview story material from your project context.",
        href: "/upload",
        label: "Live",
        icon: "AI",
    },
    {
        title: "CareerIndex Hub",
        description: "Open and manage your generated profile through your personal tokenized hub.",
        href: "/upload",
        label: "Live",
        icon: "HUB",
    },
    {
        title: "Shareable CV Links",
        description: "Publish or unpublish CV snapshots and share them through dedicated public URLs.",
        href: "/upload",
        label: "Live",
        icon: "CV",
    },
    {
        title: "Public Profile Page",
        description: "Expose selected profile content through a clean public slug page for recruiters.",
        href: "/upload",
        label: "Live",
        icon: "PP",
    },
    {
        title: "Public Pitch Chat",
        description: "Provide interactive project Q&A on your public pitch page for deeper role fit context.",
        href: "/upload",
        label: "Live",
        icon: "QA",
    },
] as const

const targetRoles = ["Developers", "Engineers", "Technical Students", "Early-Career Tech Talent"] as const

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
    const primaryLabel = user?.cvToken ? marketingCopy.home.ctaPrimaryOpen : marketingCopy.home.ctaPrimaryCreate

    return (
        <main className="min-h-screen bg-[#020817] text-slate-100">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(59,130,246,0.18),transparent_36%),radial-gradient(circle_at_86%_18%,rgba(139,92,246,0.18),transparent_40%),linear-gradient(180deg,#020617_0%,#030B1E_45%,#030514_100%)]" />
                <div className="absolute left-1/2 top-[28rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
            </div>

            <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 md:pb-24 md:pt-8">
                <header className="sticky top-3 z-20 mb-10 rounded-2xl border border-white/10 bg-[#050C22]/80 px-4 py-3 backdrop-blur-md md:mb-14 md:px-6">
                    <div className="flex items-center justify-between gap-4">
                        <Link href="/home" className="inline-flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-semibold tracking-wide text-white">
                                CI
                            </span>
                            <span className="text-lg font-semibold tracking-tight text-white">CareerIndex</span>
                        </Link>

                        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
                            <a href="#features" className="transition hover:text-white">
                                Features
                            </a>
                            <a href="#how-it-works" className="transition hover:text-white">
                                How It Works
                            </a>
                            <a href="#pricing" className="transition hover:text-white">
                                Pricing
                            </a>
                        </nav>

                        {!user ? (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/auth?mode=login"
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-200 transition hover:text-white"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/auth?mode=register"
                                    className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_26px_rgba(59,130,246,0.35)] transition hover:brightness-110"
                                >
                                    Get Started
                                </Link>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                                Signed in as <span className="font-medium text-slate-100">{user.name || user.email}</span>
                            </div>
                        )}
                    </div>
                </header>

                <section className="grid items-center gap-8 pb-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
                    <div>
                        <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300">
                            {marketingCopy.home.badge}
                        </p>

                        <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
                            Turn Projects Into
                            <span className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                                Career Signals.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">{marketingCopy.home.subline}</p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={primaryHref}
                                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(76,105,255,0.35)] transition hover:translate-y-[-1px] hover:brightness-110"
                            >
                                {primaryLabel}
                            </Link>
                            <Link
                                href="/upload"
                                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white px-7 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                            >
                                {marketingCopy.home.ctaSecondary}
                            </Link>
                        </div>

                        {!user && (
                            <p className="mt-5 max-w-xl rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                                {marketingCopy.home.freeHint}
                            </p>
                        )}
                    </div>

                    <div className="relative">
                        <div className="absolute -right-4 -top-4 h-28 w-28 rotate-12 rounded-3xl border border-white/15 bg-gradient-to-br from-blue-300/20 to-indigo-500/20 backdrop-blur-sm" />
                        <div className="absolute -bottom-6 -left-5 h-24 w-24 -rotate-12 rounded-3xl border border-white/15 bg-gradient-to-br from-violet-300/20 to-fuchsia-500/20 backdrop-blur-sm" />

                        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/[0.03] p-5 shadow-[0_20px_80px_rgba(15,23,42,0.6)] backdrop-blur-md sm:p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-rose-400" />
                                <span className="h-3 w-3 rounded-full bg-amber-300" />
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                            </div>

                            <div className="space-y-4">
                                <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-sm font-semibold text-white">AI Project Coach</p>
                                    <p className="mt-2 text-sm text-slate-300">
                                        I identified missing impact metrics for your backend project. Add measurable outcomes to improve recruiter clarity.
                                    </p>
                                </article>

                                <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Skill signal clarity</p>
                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                                                <span>System Design</span>
                                                <span>84%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-white/10">
                                                <div className="h-2 w-[84%] rounded-full bg-gradient-to-r from-blue-400 to-violet-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                                                <span>Communication</span>
                                                <span>67%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-white/10">
                                                <div className="h-2 w-[67%] rounded-full bg-gradient-to-r from-fuchsia-400 to-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                </article>

                                <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Export targets</p>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                                        <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">CV PDF</span>
                                        <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">Public Link</span>
                                        <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">Pitch Page</span>
                                    </div>
                                </article>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" className="scroll-mt-28 py-14">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                            Existing Features,
                            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent"> New Presentation</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-300">
                            Same backend capabilities, redesigned frontend system prepared for future growth.
                        </p>
                    </div>

                    <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {liveFeatures.map((feature) => (
                            <article
                                key={feature.title}
                                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-semibold text-white">
                                        {feature.icon}
                                    </span>
                                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                                        {feature.label}
                                    </span>
                                </div>
                                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                                <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
                                <Link href={feature.href} className="mt-5 inline-flex text-sm font-medium text-blue-300 transition hover:text-blue-200">
                                    Open feature
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="how-it-works" className="scroll-mt-28 py-14">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">{marketingCopy.home.howItWorksTitle}</h2>
                    </div>

                    <div className="mt-9 grid gap-5 lg:grid-cols-3">
                        {marketingCopy.home.howItWorksSteps.slice(0, 3).map((step) => {
                            const [stepIndex, ...rest] = step.split(". ")
                            return (
                                <article key={step} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                                    <span className="absolute -left-3 -top-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-xl font-semibold text-white">
                                        {stepIndex}
                                    </span>
                                    <p className="mt-8 text-lg font-semibold text-white">{rest.join(". ")}</p>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section className="py-14">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Built For Technical Talent</h2>
                        <p className="mt-4 text-lg text-slate-300">
                            Prepared layout blocks for segmentation without changing your current feature set.
                        </p>
                    </div>

                    <div className="mx-auto mt-9 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {targetRoles.map((role) => (
                            <article
                                key={role}
                                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-base font-semibold text-slate-100"
                            >
                                {role}
                            </article>
                        ))}
                    </div>
                </section>

                <section id="pricing" className="scroll-mt-28 py-14">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Simple, Transparent Pricing</h2>
                        <p className="mt-4 text-lg text-slate-300">
                            Pricing UI is prepared now. Plan logic can be connected when billing is introduced.
                        </p>
                    </div>

                    <div className="mx-auto mt-9 grid max-w-4xl gap-5 md:grid-cols-2">
                        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                            <p className="text-sm font-semibold uppercase tracking-wider text-slate-300">Starter</p>
                            <p className="mt-3 text-4xl font-semibold text-white">Free</p>
                            <p className="mt-2 text-sm text-slate-300">Current live access path for project signal generation and sharing.</p>
                        </article>
                        <article className="rounded-2xl border border-blue-400/25 bg-gradient-to-b from-blue-500/10 to-violet-500/10 p-6">
                            <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">Pro (Prepared)</p>
                            <p className="mt-3 text-4xl font-semibold text-white">Coming Soon</p>
                            <p className="mt-2 text-sm text-slate-300">Reserved layout slot for premium coaching/export depth once activated.</p>
                        </article>
                    </div>
                </section>
            </div>
        </main>
    )
}
