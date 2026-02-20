"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

type PublicProfileResponse = {
    publicSlug: string
    cvToken: string
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
                    evidence.push(`Rollenfit (${roleHits.slice(0, 3).join(", ")})`)
                }

                const skillHits = skillTokens.filter((token) => haystack.includes(token))
                if (skillHits.length > 0) {
                    score += Math.min(skillHits.length, 5)
                    evidence.push("Skill-Fit")
                }

                if (project.impact?.trim()) {
                    score += 3
                    evidence.push("Ergebnis dokumentiert")
                }

                if (project.tech.length > 0) {
                    score += Math.min(project.tech.length, 3)
                    evidence.push("Tech-Stack vorhanden")
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
                    result: projectMatch.impact || projectMatch.summary || "Kein Ergebnis dokumentiert",
                    ownership: projectMatch.role || "Nicht spezifiziert",
                }
            }

            const experienceMatch = profile.profile.experience.find((item) =>
                item.keywords.some((keyword) => keyword.toLowerCase().includes(lowerSkill) || lowerSkill.includes(keyword.toLowerCase()))
            )

            if (experienceMatch) {
                return {
                    skill,
                    proofIn: experienceMatch.organization || "Erfahrung",
                    result: experienceMatch.responsibilities[0] || "Kein Ergebnis dokumentiert",
                    ownership: experienceMatch.role || "Nicht spezifiziert",
                }
            }

            return {
                skill,
                proofIn: "Nicht zugeordnet",
                result: "Kein Nachweis in Projekten/Erfahrung gefunden",
                ownership: "Nicht spezifiziert",
            }
        })
    }, [profile, rankedProjects])

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div className="mb-4 flex items-center justify-between print:hidden">
                    <Link href={`/u/${publicSlug}`} className="rounded-md border bg-white px-3 py-2 text-sm">
                        Zur Public Profile Seite
                    </Link>
                    <button onClick={() => window.print()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                        Als PDF exportieren
                    </button>
                </div>

                {loading && <p className="text-sm text-slate-600">Lade Pitch-Daten...</p>}
                {error && !profile && <p className="text-sm text-red-600">{error}</p>}

                {profile && (
                    <div className="rounded-lg border bg-white p-6 sm:p-8 print:border-0 print:p-0">
                        <header className="grid gap-6 border-b pb-8 sm:grid-cols-[1fr_320px]">
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight">{profile.meta.name}</h1>
                                <p className="mt-3 text-xl text-slate-700">{profile.meta.position || "Position nicht angegeben"}</p>
                                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-700">
                                    {profile.meta.summary || profile.profile.person.summary || "Keine Zusammenfassung vorhanden."}
                                </p>
                            </div>

                            <aside className="rounded-md border border-blue-300 bg-blue-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Profil-Kontext</p>
                                <div className="mt-3 space-y-3 text-sm">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Primaerer Fokusbereich</p>
                                        <p className="font-medium">{profile.meta.position || "Nicht gesetzt"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Typischer Projekt-Umfang</p>
                                        <p className="font-medium">Web-App, API, Datenmodell, Frontend</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Skills im Profil</p>
                                        <p className="font-medium">{profile.profile.skills.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Aktualisiert</p>
                                        <p className="font-medium">{new Date(profile.updatedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </aside>
                        </header>

                        <section className="mt-8 border-b pb-8">
                            <h2 className="text-3xl font-semibold tracking-tight">Gelieferte Ergebnisse</h2>
                            <div className="mt-5 space-y-4">
                                {topProjects.length === 0 && <p className="text-sm text-slate-600">Keine Projekte vorhanden.</p>}

                                {topProjects.map((project, idx) => (
                                    <article key={`${project.name}-${idx}`} className="grid gap-4 rounded-md border p-4 sm:grid-cols-[1.2fr_1fr]">
                                        <div>
                                            <h3 className="text-lg font-semibold">{project.name || "Projekt"}</h3>
                                            {project.role && <p className="mt-1 text-sm text-slate-700">{project.role}</p>}

                                            <div className="mt-4 space-y-3 text-sm">
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Problem</p>
                                                    <p className="text-slate-700">{project.summary || "Nicht dokumentiert"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Aktion</p>
                                                    <p className="text-slate-700">{project.tech.length > 0 ? `Implementierung mit ${project.tech.join(", ")}` : "Tech-Umsetzung nicht spezifiziert"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Angewandte Faehigkeiten</p>
                                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                                        {(project.tech.length > 0 ? project.tech : ["BAUSTELLE"]).slice(0, 8).map((tech) => (
                                                            <span key={tech} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                                                {tech}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-md border bg-slate-50 p-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Verantwortungsebene</p>
                                            <p className="mt-1 text-sm text-slate-800">{project.role || "Nicht spezifiziert"}</p>

                                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Umfang</p>
                                            <p className="mt-1 text-sm text-slate-800">{project.tech.length > 0 ? `${project.tech.length} Technologien` : "Nicht angegeben"}</p>

                                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-green-700">Ergebnis</p>
                                            <p className="mt-1 text-sm text-slate-900">{project.impact || "Kein Ergebnis dokumentiert"}</p>

                                            {project.evidence.length > 0 && (
                                                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-700">
                                                    {project.evidence.slice(0, 4).map((item) => (
                                                        <li key={item}>{item}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="mt-8 border-b pb-8">
                            <h2 className="text-3xl font-semibold tracking-tight">Faehigkeit {"<->"} Nachweis</h2>
                            {skillEvidence.length === 0 ? (
                                <p className="mt-4 text-sm text-slate-600">Keine Skills verfuegbar.</p>
                            ) : (
                                <div className="mt-5 overflow-x-auto rounded-md border">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-blue-600 text-white">
                                            <tr>
                                                <th className="px-3 py-2 font-semibold">Faehigkeit</th>
                                                <th className="px-3 py-2 font-semibold">Nachgewiesen in</th>
                                                <th className="px-3 py-2 font-semibold">Ergebnis</th>
                                                <th className="px-3 py-2 font-semibold">Ownership</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {skillEvidence.map((row) => (
                                                <tr key={row.skill} className="border-t">
                                                    <td className="px-3 py-2 font-medium">{row.skill}</td>
                                                    <td className="px-3 py-2 text-slate-700">{row.proofIn}</td>
                                                    <td className="px-3 py-2 text-slate-700">{row.result}</td>
                                                    <td className="px-3 py-2">
                                                        <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">{row.ownership}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section className="mt-8 rounded-md border border-blue-300 bg-blue-50 p-6 text-center">
                            <h2 className="text-3xl font-semibold tracking-tight">Mehr ueber meine Projekte & Arbeitsweise</h2>
                            <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-700">
                                Entdecke technische Details, Architektur-Entscheidungen und stelle Fragen im interaktiven Deep Dive.
                            </p>
                            <Link href={`/u/${publicSlug}`} className="mt-5 inline-flex rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
                                Zur Personal Site
                            </Link>

                            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-700">
                                <span>Interaktiver Q&A Chatbot</span>
                                <span>Code-Snippets & Architektur</span>
                                <span>Projekt-Deep-Dive</span>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    )
}
