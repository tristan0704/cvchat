import { redirect } from "next/navigation";

import { DashboardMetricBars } from "@/components/dashboard/DashboardMetricBars";
import { DashboardRecentInterviewsCard } from "@/components/dashboard/DashboardRecentInterviewsCard";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getDashboardStatsSnapshot } from "@/db-backend/interviews/read/interview-read-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createServerTiming } from "@/lib/server-timing";

function formatScore(value: number | null) {
    return value === null || value === undefined ? "--" : `${value}%`;
}

export default async function DashboardPage() {
    const timing = createServerTiming("page.dashboard");
    const currentUser = await timing.measure("auth.appUser", () =>
        getCurrentAppUser()
    );

    if (!currentUser) {
        redirect("/auth/login");
    }

    const [stats, profile] = await Promise.all([
        timing.measure("db.dashboardStats", () =>
            getDashboardStatsSnapshot(currentUser.id)
        ),
        getProfileSnapshot(currentUser.id),
    ]);
    const dictionary = getDictionary(profile.language);
    const labels = dictionary.dashboard;
    const locale = profile.language === "de" ? "de-DE" : "en-US";

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(stats).length,
    });

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                        {labels.eyebrow}
                    </p>
                    <h1 className="mt-3 text-3xl font-bold">{labels.title}</h1>
                    <p className="mt-4 text-gray-400">{labels.description}</p>
                </div>

                <section className="mt-8 grid gap-4 lg:grid-cols-4">
                    <DashboardStatCard
                        detail={labels.xpDetail}
                        label={labels.xp}
                        value={String(stats.xpPoints)}
                    />
                    <DashboardStatCard
                        detail={labels.completedDetail}
                        label={labels.completedInterviews}
                        ringValue={stats.successRate}
                        value={String(stats.completedInterviews)}
                    />
                    <DashboardStatCard
                        detail={labels.cvScoreDetail}
                        label={labels.cvScore}
                        ringValue={stats.cv.overallScore}
                        value={formatScore(stats.cv.overallScore)}
                    />
                    <DashboardStatCard
                        detail={labels.codingScoreDetail}
                        label={labels.codingScore}
                        ringValue={stats.coding.overallScore}
                        value={formatScore(stats.coding.overallScore)}
                    />
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
                    <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                        <h2 className="text-lg font-semibold text-white">
                            {labels.trainingMixTitle}
                        </h2>
                        <p className="mt-2 text-sm text-gray-400">
                            {labels.trainingMixDescription}
                        </p>
                        <div className="mt-5">
                            <DashboardMetricBars
                                emptyLabel={labels.noTrainingData}
                                items={[
                                    {
                                        label: labels.voiceInterview,
                                        value: stats.trainingMix.voiceInterviews,
                                    },
                                    {
                                        label: labels.faceInterview,
                                        value: stats.trainingMix.faceInterviews,
                                    },
                                    {
                                        label: labels.coding,
                                        value: stats.trainingMix.codingEvaluatedInterviews,
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <DashboardRecentInterviewsCard
                        emptyLabel={labels.noRecentInterviews}
                        interviews={stats.recentInterviews}
                        labels={labels.recentInterviews}
                        locale={locale}
                        statusLabels={dictionary.interviews.status}
                    />
                </section>
            </main>
        </div>
    );
}
