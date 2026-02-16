"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { marketingCopy } from "@/lib/marketingCopy"

type PublicProfileResponse = {
    publicSlug: string
    publishedAt: string | null
    updatedAt: string
    meta: {
        name: string
        position: string
        summary: string
        imageUrl?: string | null
    }
    profile: {
        person: {
            name: string
            title: string
            location: string
            summary: string
        }
        skills: string[]
        experience: {
            organization: string
            role: string
            start: string
            end: string
            responsibilities: string[]
            keywords: string[]
        }[]
        projects: {
            name: string
            role: string
            summary: string
            impact: string
            tech: string[]
            links: string[]
        }[]
        education: unknown[]
        languages: unknown[]
        certificates: unknown[]
    }
}

type RankedProject = PublicProfileResponse["profile"]["projects"][number] & {
    score: number
    evidence: string[]
}

type SkillEvidenceRow = {
    skill: string
    proofIn: string
    result: string
    ownership: string
}

function tokenize(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2)
}

function formatRange(start: string, end: string) {
    const s = start?.trim()
    const e = end?.trim()
    if (!s && !e) return ""
    if (s && e) return `${s} - ${e}`
    return s || e
}

function toExternalLink(link: string) {
    if (link.startsWith("http://") || link.startsWith("https://")) return link
    return `https://${link}`
}

export default function PublicPitchPage() {
    const params = useParams()
    const publicSlug = params.publicSlug as string

    const [profile, setProfile] = useState<PublicProfileResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        async function loadProfile() {
            setLoading(true)
            setError("")
            try {
                const res = await fetch(`/api/public-profile/${publicSlug}`)
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                    setError(data.error || "Profile not found")
                    return
                }
                setProfile(data)
            } catch {
                setError("Server not reachable")
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [publicSlug])

    const rankedProjects = useMemo<RankedProject[]>(() => {
        if (!profile) return []

        const roleTokens = tokenize(profile.meta.position || profile.profile.person.title || "")
        const skillTokens = profile.profile.skills.flatMap((skill) => tokenize(skill))

        return profile.profile.projects
            .map((project) => {
                const haystack = `${project.name} ${project.role} ${project.summary} ${project.impact} ${project.tech.join(" ")}`.toLowerCase()
                let score = 0
                const evidence: string[] = []

                const roleHits = roleTokens.filter((token) => haystack.includes(token))
                if (roleHits.length > 0) {
                    score += roleHits.length * 3
                    evidence.push(`Role match (${roleHits.slice(0, 3).join(", ")})`)
                }

                const skillHits = skillTokens.filter((token) => haystack.includes(token))
                if (skillHits.length > 0) {
                    score += Math.min(skillHits.length, 5)
                    evidence.push("Skill match")
                }

                if (project.impact?.trim()) {
                    score += 3
                    evidence.push("Outcome documented")
                }

                if (project.tech.length > 0) {
                    score += Math.min(project.tech.length, 3)
                    evidence.push("Tech stack listed")
                }

                if (project.summary?.trim()) score += 2

                return {
                    ...project,
                    score,
                    evidence,
                }
            })
            .sort((a, b) => b.score - a.score)
    }, [profile])

    const topProjects = useMemo(() => rankedProjects.slice(0, 3), [rankedProjects])

    const decisionSignals = useMemo(() => {
        if (!profile) return [] as string[]

        const projectSignals = topProjects.flatMap((project) => {
            const signals: string[] = []
            if (project.impact) signals.push(`${project.name || "Project"}: ${project.impact}`)
            else if (project.summary) signals.push(`${project.name || "Project"}: ${project.summary}`)
            return signals
        })

        const experienceSignals = profile.profile.experience
            .flatMap((item) => item.responsibilities.slice(0, 1).map((resp) => `${item.role || "Role"}: ${resp}`))
            .slice(0, 3)

        return [...projectSignals, ...experienceSignals].slice(0, 3)
    }, [profile, topProjects])

    const skillEvidence = useMemo<SkillEvidenceRow[]>(() => {
        if (!profile) return []

        return profile.profile.skills.slice(0, 12).map((skill) => {
            const lowerSkill = skill.toLowerCase()
            const projectMatch = rankedProjects.find((project) =>
                project.tech.some((tech) => tech.toLowerCase().includes(lowerSkill) || lowerSkill.includes(tech.toLowerCase()))
            )

            if (projectMatch) {
                return {
                    skill,
                    proofIn: projectMatch.name || "Project",
                    result: projectMatch.impact || projectMatch.summary || "No outcome documented",
                    ownership: projectMatch.role || "Not specified",
                }
            }

            const experienceMatch = profile.profile.experience.find((item) =>
                item.keywords.some((keyword) => keyword.toLowerCase().includes(lowerSkill) || lowerSkill.includes(keyword.toLowerCase()))
            )

            if (experienceMatch) {
                return {
                    skill,
                    proofIn: experienceMatch.organization || "Experience",
                    result: experienceMatch.responsibilities[0] || "No outcome documented",
                    ownership: experienceMatch.role || "Not specified",
                }
            }

            return {
                skill,
                proofIn: "Not mapped",
                result: "No project/experience evidence found",
                ownership: "Not specified",
            }
        })
    }, [profile, rankedProjects])

    const distinctRoles = useMemo(() => {
        if (!profile) return []
        return Array.from(new Set(profile.profile.experience.map((item) => item.role).filter(Boolean))).slice(0, 8)
    }, [profile])

    const distinctOrgs = useMemo(() => {
        if (!profile) return []
        return Array.from(new Set(profile.profile.experience.map((item) => item.organization).filter(Boolean))).slice(0, 8)
    }, [profile])

    return (
        <main className="min-h-screen bg-[#020817] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(59,130,246,0.16),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.16),transparent_42%),linear-gradient(180deg,#020617_0%,#040B1E_45%,#030514_100%)]" />
            </div>

            <div className="mx-auto w-full max-w-6xl">
                <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <Link href={`/u/${publicSlug}`} className="text-sm font-semibold text-slate-100 hover:text-white">
                            Back to profile page
                        </Link>
                        <div className="flex items-center gap-2 print:hidden">
                            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-300">
                                {marketingCopy.publicPitch.badge}
                            </span>
                            <button
                                onClick={() => window.print()}
                                className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white"
                            >
                                Export as PDF
                            </button>
                        </div>
                    </div>

                    {profile && (
                        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
                            <div className="min-w-0">
                                <h1 className="break-words text-3xl font-semibold tracking-tight text-white">{profile.meta.name}</h1>
                                <p className="mt-1 break-words text-xl text-slate-300">{profile.meta.position || "No position specified"}</p>
                                <p className="mt-4 max-w-3xl break-words text-sm leading-relaxed text-slate-300">
                                    {profile.meta.summary || "No summary provided."}
                                </p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:w-80">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Profile context</p>
                                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                    <li>Last update: {new Date(profile.updatedAt).toLocaleString()}</li>
                                    <li>Location: {profile.profile.person.location || "Not specified"}</li>
                                    <li>Skills: {profile.profile.skills.length}</li>
                                    <li>Projects: {profile.profile.projects.length}</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </header>

                {loading && <p className="mt-6 text-sm text-slate-400">Loading pitch data...</p>}
                {error && !profile && <p className="mt-6 text-sm text-rose-300">{error}</p>}

                {profile && (
                    <>
                        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                            <h2 className="text-lg font-semibold text-white">{marketingCopy.publicPitch.decisionSignalsTitle}</h2>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                {decisionSignals.length === 0 && <p className="text-sm text-slate-300">No clear signals derivable from current data.</p>}
                                {decisionSignals.map((signal, idx) => (
                                    <article key={`${signal}-${idx}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
                                        {signal}
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="mt-8">
                            <h2 className="text-2xl font-semibold tracking-tight text-white">{marketingCopy.publicPitch.resultsTitle}</h2>
                            <div className="mt-4 space-y-4">
                                {topProjects.length === 0 && <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">No projects available.</div>}

                                {topProjects.map((project, idx) => (
                                    <article key={`${project.name}-${idx}`} className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm lg:grid-cols-[1.15fr_1fr]">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">{project.name || "Untitled project"}</h3>
                                            {project.role && <p className="mt-1 text-sm text-slate-300">{project.role}</p>}
                                            {project.summary && <p className="mt-3 text-sm leading-relaxed text-slate-300">{project.summary}</p>}

                                            {project.tech.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {project.tech.map((tech) => (
                                                        <span key={`${project.name}-${tech}`} className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-200">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Why prioritized</p>
                                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
                                                {project.evidence.length === 0 && <li>Base project data available</li>}
                                                {project.evidence.map((item) => (
                                                    <li key={`${project.name}-${item}`}>{item}</li>
                                                ))}
                                            </ul>
                                            <div className="mt-3 border-t border-white/10 pt-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Outcome</p>
                                                <p className="mt-1 text-sm text-slate-100">{project.impact || "No documented outcome"}</p>
                                            </div>

                                            {project.links.length > 0 && (
                                                <div className="mt-3 border-t border-white/10 pt-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Links</p>
                                                    <div className="mt-2 flex flex-col gap-1">
                                                        {project.links.map((link) => (
                                                            <a
                                                                key={`${project.name}-${link}`}
                                                                href={toExternalLink(link)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="break-all text-sm text-blue-300 underline"
                                                            >
                                                                {link}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                            <h2 className="text-2xl font-semibold tracking-tight text-white">{marketingCopy.publicPitch.evidenceTitle}</h2>

                            {skillEvidence.length === 0 ? (
                                <p className="mt-4 text-sm text-slate-300">No skills available.</p>
                            ) : (
                                <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
                                    <table className="min-w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="bg-[#0B132C] text-slate-100">
                                                <th className="px-4 py-3 font-semibold">Skill</th>
                                                <th className="px-4 py-3 font-semibold">Evidence in</th>
                                                <th className="px-4 py-3 font-semibold">Outcome</th>
                                                <th className="px-4 py-3 font-semibold">Ownership</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {skillEvidence.map((row) => (
                                                <tr key={row.skill} className="border-t border-white/10 bg-white/[0.02]">
                                                    <td className="px-4 py-3 font-medium text-white">{row.skill}</td>
                                                    <td className="px-4 py-3 text-slate-300">{row.proofIn}</td>
                                                    <td className="px-4 py-3 text-slate-300">{row.result}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-slate-100">{row.ownership}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                            <h2 className="text-2xl font-semibold tracking-tight text-white">Work context</h2>
                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <article className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Roles</p>
                                    {distinctRoles.length === 0 ? (
                                        <p className="mt-2 text-sm text-slate-300">No roles listed.</p>
                                    ) : (
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
                                            {distinctRoles.map((role) => (
                                                <li key={role}>{role}</li>
                                            ))}
                                        </ul>
                                    )}
                                </article>

                                <article className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Organizations</p>
                                    {distinctOrgs.length === 0 ? (
                                        <p className="mt-2 text-sm text-slate-300">No organizations listed.</p>
                                    ) : (
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
                                            {distinctOrgs.map((org) => (
                                                <li key={org}>{org}</li>
                                            ))}
                                        </ul>
                                    )}
                                </article>

                                <article className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Timelines</p>
                                    {profile.profile.experience.length === 0 ? (
                                        <p className="mt-2 text-sm text-slate-300">No timelines listed.</p>
                                    ) : (
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
                                            {profile.profile.experience.slice(0, 8).map((item, idx) => (
                                                <li key={`${item.organization}-${item.role}-${idx}`}>
                                                    {item.role || "Role"}: {formatRange(item.start, item.end) || "Not specified"}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
                            </div>
                        </section>

                        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                            <h2 className="text-2xl font-semibold tracking-tight text-white">Next step</h2>
                            <p className="mt-2 text-sm text-slate-300">For deeper technical follow-up questions, move to the public profile chatbot.</p>
                            <Link
                                href={`/u/${publicSlug}#chatbot`}
                                className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white"
                            >
                                Open profile chatbot
                            </Link>
                        </section>
                    </>
                )}
            </div>
        </main>
    )
}
