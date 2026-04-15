"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function StatCard({
    title,
    value,
    trend,
    trendUp,
}: {
    title: string;
    value: string;
    trend: string;
    trendUp: boolean;
}) {
    return (
        <div className="rounded-xl bg-gray-800/50 p-5 outline outline-1 outline-white/10 transition hover:bg-gray-800/70">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{title}</p>

                <span
                    className={`text-xs font-medium ${
                        trendUp ? "text-green-400" : "text-red-400"
                    }`}
                >
                    {trendUp ? "▲" : "▼"} {trend}
                </span>
            </div>

            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
    );
}

type HomeSummary = {
    totalInterviews: number;
    completedInterviews: number;
    cvScore: number | null;
    successRate: number | null;
    recentInterviews: Array<{
        id: string;
        title: string;
    }>;
};

export default function HomePage() {
    const [summary, setSummary] = useState<HomeSummary | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function hydrateSummary() {
            try {
                const response = await fetch("/api/home/summary", {
                    method: "GET",
                    cache: "no-store",
                });
                const data = (await response.json().catch(() => null)) as
                    | (HomeSummary & { error?: string })
                    | null;

                if (!response.ok || !data || data.error) {
                    throw new Error(data?.error || "Dashboard konnte nicht geladen werden.");
                }

                if (!cancelled) {
                    setSummary(data);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Dashboard konnte nicht geladen werden."
                    );
                }
            }
        }

        void hydrateSummary();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">Home</h1>

                <p className="mt-4 text-gray-400">Willkommen bei CareerPitch.</p>

                {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Interviews gesamt"
                        value={String(summary?.totalInterviews ?? 0)}
                        trend={summary?.totalInterviews ? "aktiv" : "neu"}
                        trendUp={true}
                    />

                    <StatCard
                        title="Abgeschlossen"
                        value={String(summary?.completedInterviews ?? 0)}
                        trend={
                            summary?.totalInterviews
                                ? `${summary.completedInterviews}/${summary.totalInterviews}`
                                : "0/0"
                        }
                        trendUp={true}
                    />

                    <StatCard
                        title="CV Score"
                        value={
                            summary?.cvScore === null || summary?.cvScore === undefined
                                ? "--"
                                : `${summary.cvScore}%`
                        }
                        trend="letzte Analyse"
                        trendUp={true}
                    />

                    <StatCard
                        title="Erfolgsquote"
                        value={
                            summary?.successRate === null ||
                            summary?.successRate === undefined
                                ? "--"
                                : `${summary.successRate}%`
                        }
                        trend="completed"
                        trendUp={true}
                    />
                </div>

                <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Link
                        href="/interviews/new"
                        className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 transition hover:bg-gray-800/70"
                    >
                        <p className="text-lg font-semibold">Simulation starten</p>
                        <p className="mt-2 text-sm text-gray-400">
                            Starte ein neues Interview
                        </p>
                    </Link>

                    <Link
                        href="/interviews"
                        className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 transition hover:bg-gray-800/70"
                    >
                        <p className="text-lg font-semibold">Ergebnisse ansehen</p>
                        <p className="mt-2 text-sm text-gray-400">
                            Analysiere deine Performance
                        </p>
                    </Link>

                    <Link
                        href="/profile"
                        className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 transition hover:bg-gray-800/70"
                    >
                        <p className="text-lg font-semibold">Profil bearbeiten</p>
                        <p className="mt-2 text-sm text-gray-400">
                            Aktualisiere deinen Lebenslauf
                        </p>
                    </Link>
                </div>

                {summary?.recentInterviews?.length ? (
                    <div className="mt-10 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                        <h2 className="text-lg font-semibold text-white">
                            Letzte Interviews
                        </h2>

                        <div className="mt-4 space-y-3">
                            {summary.recentInterviews.map((interview) => (
                                <Link
                                    key={interview.id}
                                    href={`/interviews/${interview.id}`}
                                    className="block rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-200 outline outline-1 outline-white/10 transition hover:bg-white/5"
                                >
                                    {interview.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
