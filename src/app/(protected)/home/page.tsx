import { redirect } from "next/navigation";

import { HomeMiniStats } from "@/components/home/HomeMiniStats";
import { RecommendedInterviewCards } from "@/components/home/RecommendedInterviewCards";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getHomeStartSnapshot } from "@/db-backend/interviews/read/interview-read-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createServerTiming } from "@/lib/server-timing";

export default async function HomePage() {
    const timing = createServerTiming("page.home");
    const currentUser = await timing.measure("auth.appUser", () =>
        getCurrentAppUser()
    );

    if (!currentUser) {
        redirect("/auth/login");
    }

    const [summary, profile] = await Promise.all([
        timing.measure("db.homeStart", () =>
            getHomeStartSnapshot(currentUser.id)
        ),
        getProfileSnapshot(currentUser.id),
    ]);
    const labels = getDictionary(profile.language).home;

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(summary).length,
    });

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                        {labels.startEyebrow}
                    </p>
                    <h1 className="mt-3 text-3xl font-bold">{labels.title}</h1>
                    <p className="mt-4 text-gray-400">{labels.welcome}</p>
                </div>

                <RecommendedInterviewCards labels={labels} />

                <HomeMiniStats
                    cvScore={summary.cvScore}
                    labels={labels}
                    latestInterview={summary.latestInterview}
                    xpPoints={summary.xpPoints}
                />
            </main>
        </div>
    );
}
