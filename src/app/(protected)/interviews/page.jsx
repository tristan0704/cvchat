import InterviewTable from "@/components/interviews/InterviewTable";

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { listInterviewsForUser } from "@/db-backend/interviews/read/interview-read-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createServerTiming } from "@/lib/server-timing";

export default async function InterviewsPage() {
  const timing = createServerTiming("page.interviews");
  const currentUser = await timing.measure("auth.appUser", () =>
    getCurrentAppUser()
  );

  if (!currentUser) {
    redirect("/auth/login");
  }

  // Die Liste wird als Initialdaten gerendert, damit der Browser keinen
  // zusätzlichen GET direkt nach dem Seitenaufbau auslösen muss.
  const [interviews, profile] = await Promise.all([
    timing.measure("db.interviewList", () => listInterviewsForUser(currentUser.id)),
    getProfileSnapshot(currentUser.id),
  ]);
  const labels = getDictionary(profile.language).interviews;

  timing.log({
    status: 200,
    payloadBytes: JSON.stringify(interviews).length,
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{labels.title}</h1>
            <p className="mt-4 text-gray-400">
              {labels.description}
            </p>
          </div>

          {/* BUTTON */}
          <Link
            href="/interviews/new"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition"
          >
            {labels.newInterview}
          </Link>
        </div>

        {/* TABLE */}
        <div className="mt-8">
          <InterviewTable initialInterviews={interviews} />
        </div>
      </main>
    </div>
  );
}
