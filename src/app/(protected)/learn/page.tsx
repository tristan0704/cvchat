import { redirect } from "next/navigation";

import { LearnChallengePlaceholders } from "@/components/learn/LearnChallengePlaceholders";
import { LearnStartSimulationPanel } from "@/components/learn/LearnStartSimulationPanel";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LearnPage() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        redirect("/auth/login");
    }

    const profile = await getProfileSnapshot(currentUser.id);
    const labels = getDictionary(profile.language).learn;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-bold">{labels.title}</h1>
                    <p className="mt-4 text-gray-400">{labels.description}</p>
                </div>

                <LearnStartSimulationPanel
                    buttonLabel={labels.startButton}
                    description={labels.startDescription}
                    title={labels.startTitle}
                />

                <LearnChallengePlaceholders
                    items={labels.futureChallenges.items}
                    title={labels.futureChallenges.title}
                />
            </main>
        </div>
    );
}
