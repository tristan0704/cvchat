import Link from "next/link";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

type LatestInterview = {
    id: string;
    title: string;
    role: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    interviewMode: "voice" | "face" | null;
} | null;

type HomeMiniStatsProps = {
    cvScore: number | null;
    labels: AppDictionary["home"];
    latestInterview: LatestInterview;
    xpPoints: number;
};

function formatScore(value: number | null) {
    return value === null || value === undefined ? "--" : `${value}%`;
}

function MiniStat({
    label,
    value,
    detail,
}: {
    detail: string;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl bg-gray-800/50 p-5 outline outline-1 outline-white/10">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-xs text-gray-500">{detail}</p>
        </div>
    );
}

export function HomeMiniStats({
    cvScore,
    labels,
    latestInterview,
    xpPoints,
}: HomeMiniStatsProps) {
    return (
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
            <MiniStat
                detail={labels.xpDetail}
                label={labels.xp}
                value={String(xpPoints)}
            />
            <MiniStat
                detail={labels.latestAnalysis}
                label={labels.cvScore}
                value={formatScore(cvScore)}
            />
            <div className="rounded-xl bg-gray-800/50 p-5 outline outline-1 outline-white/10">
                <p className="text-sm text-gray-400">{labels.latestInterview}</p>
                {latestInterview ? (
                    <>
                        <Link
                            href={`/interviews/${latestInterview.id}`}
                            className="mt-3 block truncate text-lg font-semibold text-white hover:text-indigo-300"
                        >
                            {latestInterview.title}
                        </Link>
                        <p className="mt-2 text-xs text-gray-500">
                            {latestInterview.role}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="mt-3 text-2xl font-semibold text-white">--</p>
                        <p className="mt-2 text-xs text-gray-500">
                            {labels.noInterviews}
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}
