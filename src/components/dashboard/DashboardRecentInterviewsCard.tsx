import Link from "next/link";

type RecentInterview = {
    id: string;
    title: string;
    role: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    interviewMode: string | null;
    overallScore: number | null;
    faceScore: number | null;
    codingScore: number | null;
};

type DashboardRecentInterviewsCardProps = {
    emptyLabel: string;
    labels: {
        title: string;
        open: string;
        overallScore: string;
        codingScore: string;
        faceScore: string;
        modeFallback: string;
    };
    locale: string;
    statusLabels: Record<string, string>;
    interviews: RecentInterview[];
};

function formatScore(value: number | null) {
    return value === null || value === undefined ? "--" : `${value}%`;
}

function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    }).format(new Date(value));
}

export function DashboardRecentInterviewsCard({
    emptyLabel,
    labels,
    locale,
    statusLabels,
    interviews,
}: DashboardRecentInterviewsCardProps) {
    return (
        <section className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-white">{labels.title}</h2>
                <Link
                    href="/interviews"
                    className="text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
                >
                    {labels.open}
                </Link>
            </div>

            {interviews.length === 0 ? (
                <div className="mt-5 rounded-xl bg-gray-900/80 p-4 text-sm text-gray-400 outline outline-1 outline-white/10">
                    {emptyLabel}
                </div>
            ) : (
                <div className="mt-5 divide-y divide-white/10">
                    {interviews.map((interview) => (
                        <Link
                            key={interview.id}
                            href={`/interviews/${interview.id}`}
                            className="grid gap-3 py-4 transition first:pt-0 last:pb-0 hover:text-indigo-100 md:grid-cols-[1.3fr_0.8fr_1fr]"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                    {interview.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {interview.role} ·{" "}
                                    {interview.interviewMode ?? labels.modeFallback}
                                </p>
                            </div>
                            <div className="text-xs text-gray-400">
                                <p>{formatDate(interview.completedAt ?? interview.createdAt, locale)}</p>
                                <p className="mt-1">
                                    {statusLabels[interview.status] ?? interview.status}
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <p className="text-gray-500">{labels.overallScore}</p>
                                    <p className="mt-1 font-semibold text-white">
                                        {formatScore(interview.overallScore)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">{labels.codingScore}</p>
                                    <p className="mt-1 font-semibold text-white">
                                        {formatScore(interview.codingScore)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">{labels.faceScore}</p>
                                    <p className="mt-1 font-semibold text-white">
                                        {formatScore(interview.faceScore)}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
