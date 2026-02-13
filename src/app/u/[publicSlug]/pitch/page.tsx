"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

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
                    setError(data.error || "Profil nicht gefunden")
                    return
                }
                setProfile(data)
            } catch {
                setError("Server nicht erreichbar")
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
                    evidence.push(`Rollenbezug (${roleHits.slice(0, 3).join(", ")})`)
                }

                const skillHits = skillTokens.filter((token) => haystack.includes(token))
                if (skillHits.length > 0) {
                    score += Math.min(skillHits.length, 5)
                    evidence.push("Skill-Match")
                }

                if (project.impact?.trim()) {
                    score += 3
                    evidence.push("Impact hinterlegt")
                }

                if (project.tech.length > 0) {
                    score += Math.min(project.tech.length, 3)
                    evidence.push("Tech-Stack genannt")
                }

                if (project.summary?.trim()) {
                    score += 2
                }

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
            if (project.impact) signals.push(`${project.name || "Projekt"}: ${project.impact}`)
            else if (project.summary) signals.push(`${project.name || "Projekt"}: ${project.summary}`)
            return signals
        })

        const experienceSignals = profile.profile.experience
            .flatMap((item) => item.responsibilities.slice(0, 1).map((resp) => `${item.role || "Rolle"}: ${resp}`))
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
                    proofIn: projectMatch.name || "Projekt",
                    result: projectMatch.impact || projectMatch.summary || "Kein Ergebnis hinterlegt",
                    ownership: projectMatch.role || "Nicht hinterlegt",
                }
            }

            const experienceMatch = profile.profile.experience.find((item) =>
                item.keywords.some((keyword) => keyword.toLowerCase().includes(lowerSkill) || lowerSkill.includes(keyword.toLowerCase()))
            )

            if (experienceMatch) {
                return {
                    skill,
                    proofIn: experienceMatch.organization || "Experience",
                    result: experienceMatch.responsibilities[0] || "Kein Ergebnis hinterlegt",
                    ownership: experienceMatch.role || "Nicht hinterlegt",
                }
            }

            return {
                skill,
                proofIn: "Nicht zugeordnet",
                result: "Kein Nachweis in Projekten/Experience hinterlegt",
                ownership: "Nicht hinterlegt",
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
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto w-full max-w-6xl">
                <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <Link href={`/u/${publicSlug}`} className="text-sm font-semibold text-gray-900">
                            Zurueck zur Personal Seite
                        </Link>
                        <div className="flex items-center gap-2 print:hidden">
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                                Web Pitch (PDF Ersatz)
                            </span>
                            <button
                                onClick={() => window.print()}
                                className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white"
                            >
                                Als PDF herunterladen
                            </button>
                        </div>
                    </div>

                    {profile && (
                        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
                            <div className="min-w-0">
                                <h1 className="break-words text-3xl font-semibold tracking-tight text-gray-900">{profile.meta.name}</h1>
                                <p className="mt-1 break-words text-xl text-gray-700">{profile.meta.position || "Position nicht hinterlegt"}</p>
                                <p className="mt-4 max-w-3xl break-words text-sm leading-relaxed text-gray-600">
                                    {profile.meta.summary || "Keine Zusammenfassung hinterlegt."}
                                </p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:w-80">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Profil-Kontext</p>
                                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                                    <li>Letztes Update: {new Date(profile.updatedAt).toLocaleString()}</li>
                                    <li>Standort: {profile.profile.person.location || "Nicht hinterlegt"}</li>
                                    <li>Skills: {profile.profile.skills.length}</li>
                                    <li>Projekte: {profile.profile.projects.length}</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </header>

                {loading && <p className="mt-6 text-sm text-gray-500">Pitch-Daten werden geladen...</p>}
                {error && !profile && <p className="mt-6 text-sm text-red-600">{error}</p>}

                {profile && (
                    <>
                        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-900">Entscheidungs-Signale</h2>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                {decisionSignals.length === 0 && <p className="text-sm text-gray-600">Keine Signale aus den aktuellen Daten ableitbar.</p>}
                                {decisionSignals.map((signal, idx) => (
                                    <article key={`${signal}-${idx}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                                        {signal}
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="mt-8">
                            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Gelieferte Ergebnisse</h2>
                            <div className="mt-4 space-y-4">
                                {topProjects.length === 0 && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">Keine Projekte hinterlegt.</div>
                                )}

                                {topProjects.map((project, idx) => (
                                    <article key={`${project.name}-${idx}`} className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:grid-cols-[1.15fr_1fr]">
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">{project.name || "Projekt ohne Titel"}</h3>
                                            {project.role && <p className="mt-1 text-sm text-gray-700">{project.role}</p>}

                                            {project.summary && <p className="mt-3 text-sm leading-relaxed text-gray-700">{project.summary}</p>}

                                            {project.tech.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {project.tech.map((tech) => (
                                                        <span key={`${project.name}-${tech}`} className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Warum priorisiert</p>
                                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700">
                                                {project.evidence.length === 0 && <li>Basisdaten vorhanden</li>}
                                                {project.evidence.map((item) => (
                                                    <li key={`${project.name}-${item}`}>{item}</li>
                                                ))}
                                            </ul>
                                            <div className="mt-3 border-t border-gray-200 pt-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Ergebnis</p>
                                                <p className="mt-1 text-sm text-gray-800">{project.impact || "Kein Ergebnis hinterlegt"}</p>
                                            </div>

                                            {project.links.length > 0 && (
                                                <div className="mt-3 border-t border-gray-200 pt-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Links</p>
                                                    <div className="mt-2 flex flex-col gap-1">
                                                        {project.links.map((link) => (
                                                            <a
                                                                key={`${project.name}-${link}`}
                                                                href={toExternalLink(link)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="break-all text-sm text-gray-800 underline"
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

                        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Faehigkeit {'<->'} Nachweis</h2>

                            {skillEvidence.length === 0 ? (
                                <p className="mt-4 text-sm text-gray-600">Keine Skills hinterlegt.</p>
                            ) : (
                                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-900 text-white">
                                                <th className="px-4 py-3 font-semibold">Faehigkeit</th>
                                                <th className="px-4 py-3 font-semibold">Nachgewiesen in</th>
                                                <th className="px-4 py-3 font-semibold">Ergebnis</th>
                                                <th className="px-4 py-3 font-semibold">Ownership</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {skillEvidence.map((row) => (
                                                <tr key={row.skill} className="border-t border-gray-200 bg-white">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{row.skill}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.proofIn}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.result}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">{row.ownership}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Arbeitskontext</h2>
                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <article className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Rollen</p>
                                    {distinctRoles.length === 0 ? (
                                        <p className="mt-2 text-sm text-gray-600">Keine Rollen hinterlegt.</p>
                                    ) : (
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700">
                                            {distinctRoles.map((role) => (
                                                <li key={role}>{role}</li>
                                            ))}
                                        </ul>
                                    )}
                                </article>

                                <article className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Organisationen</p>
                                    {distinctOrgs.length === 0 ? (
                                        <p className="mt-2 text-sm text-gray-600">Keine Organisationen hinterlegt.</p>
                                    ) : (
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700">
                                            {distinctOrgs.map((org) => (
                                                <li key={org}>{org}</li>
                                            ))}
                                        </ul>
                                    )}
                                </article>

                                <article className="rounded-lg border border-gray-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Zeitraeume</p>
                                    {profile.profile.experience.length === 0 ? (
                                        <p className="mt-2 text-sm text-gray-600">Keine Zeitraeume hinterlegt.</p>
                                    ) : (
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700">
                                            {profile.profile.experience.slice(0, 8).map((item, idx) => (
                                                <li key={`${item.organization}-${item.role}-${idx}`}>
                                                    {item.role || "Rolle"}: {formatRange(item.start, item.end) || "Nicht hinterlegt"}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
                            </div>
                        </section>

                        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Naechster Schritt</h2>
                            <p className="mt-2 text-sm text-gray-700">Fuer Rueckfragen und technische Details direkt in den Personal Chatbot wechseln.</p>
                            <Link href={`/u/${publicSlug}#chatbot`} className="mt-4 inline-flex rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">
                                Zum Personal Chatbot
                            </Link>
                        </section>
                    </>
                )}
            </div>
        </main>
    )
}
