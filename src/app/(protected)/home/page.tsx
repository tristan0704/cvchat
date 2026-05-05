import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getHomeDashboardSnapshot } from "@/db-backend/interviews/read/interview-read-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createServerTiming } from "@/lib/server-timing";

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
          {trendUp ? "+" : "-"} {trend}
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

export default async function HomePage() {
  const timing = createServerTiming("page.home");
  const currentUser = await timing.measure("auth.appUser", () =>
    getCurrentAppUser(),
  );

  if (!currentUser) {
    redirect("/auth/login");
  }

  // Vermeidet einen zusätzlichen Netzwerk-Umweg nach dem ersten Render.
  const [summary, profile]: [
    HomeSummary,
    Awaited<ReturnType<typeof getProfileSnapshot>>,
  ] = await Promise.all([
    timing.measure("db.homeSummary", () => getHomeDashboardSnapshot(currentUser.id)),
    getProfileSnapshot(currentUser.id),
  ]);
  const dictionary = getDictionary(profile.language);
  const labels = dictionary.home;

  timing.log({
    status: 200,
    payloadBytes: JSON.stringify(summary).length,
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">{labels.title}</h1>

        <p className="mt-4 text-gray-400">{labels.welcome}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={labels.totalInterviews}
            value={String(summary.totalInterviews)}
            trend={summary.totalInterviews ? labels.active : labels.new}
            trendUp={true}
          />

          <StatCard
            title={labels.completed}
            value={String(summary.completedInterviews)}
            trend={
              summary.totalInterviews
                ? `${summary.completedInterviews}/${summary.totalInterviews}`
                : "0/0"
            }
            trendUp={true}
          />

          <StatCard
            title={labels.cvScore}
            value={
              summary.cvScore === null || summary.cvScore === undefined
                ? "--"
                : `${summary.cvScore}%`
            }
            trend={labels.latestAnalysis}
            trendUp={true}
          />

          <StatCard
            title={labels.successRate}
            value={
              summary.successRate === null || summary.successRate === undefined
                ? "--"
                : `${summary.successRate}%`
            }
            trend={labels.completedTrend}
            trendUp={true}
          />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href="/interviews/new"
            className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 transition hover:bg-gray-800/70"
          >
            <p className="text-lg font-semibold">{labels.startSimulation}</p>
            <p className="mt-2 text-sm text-gray-400">
              {labels.startSimulationDescription}
            </p>
          </Link>

          <Link
            href="/interviews"
            className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 transition hover:bg-gray-800/70"
          >
            <p className="text-lg font-semibold">{labels.viewResults}</p>
            <p className="mt-2 text-sm text-gray-400">
              {labels.viewResultsDescription}
            </p>
          </Link>

          <Link
            href="/profile"
            className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 transition hover:bg-gray-800/70"
          >
            <p className="text-lg font-semibold">{labels.editProfile}</p>
            <p className="mt-2 text-sm text-gray-400">
              {labels.editProfileDescription}
            </p>
          </Link>
        </div>

        {summary.recentInterviews.length ? (
          <div className="mt-10 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
            <h2 className="text-lg font-semibold text-white">
              {labels.recentInterviews}
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
