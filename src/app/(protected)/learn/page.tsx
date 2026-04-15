import Link from "next/link";

import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getHomeDashboardSnapshot } from "@/db-backend/interviews/interview-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";

function LearnCard({
    href,
    title,
    description,
    detail,
}: {
    href: string;
    title: string;
    description: string;
    detail: string;
}) {
    return (
        <Link
            href={href}
            className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 transition hover:bg-gray-800/70"
        >
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="mt-2 text-sm text-gray-300">{description}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gray-500">
                {detail}
            </p>
        </Link>
    );
}

export default async function LearnPage() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return null;
    }

    const [summary, profile] = await Promise.all([
        getHomeDashboardSnapshot(currentUser.id),
        getProfileSnapshot(currentUser.id),
    ]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">Lernen</h1>
                <p className="mt-4 max-w-2xl text-gray-400">
                    Dieser Bereich zeigt dir die naechsten sinnvollen Schritte
                    auf Basis deiner gespeicherten Profil-, CV- und Interviewdaten.
                </p>

                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    <LearnCard
                        href="/interviews/new"
                        title="Neue Simulation starten"
                        description="Waehle eine Interview-Konfiguration aus der DB und starte den naechsten Durchlauf."
                        detail={`${summary.totalInterviews} Interviews gespeichert`}
                    />
                    <LearnCard
                        href="/interviews"
                        title="Vorherige Durchlaeufe auswerten"
                        description="Oeffne gespeicherte Interview-Sessions, Coding-Challenges und Gesamtfeedback erneut."
                        detail={`${summary.completedInterviews} Interviews abgeschlossen`}
                    />
                    <LearnCard
                        href="/profile"
                        title="Profil und CV aktualisieren"
                        description="Pflege deinen aktiven Lebenslauf, damit neue Interviews mit den aktuellen Daten starten."
                        detail={
                            profile.activeCv
                                ? `Aktiver CV: ${profile.activeCv.fileName}`
                                : "Noch kein aktiver CV hinterlegt"
                        }
                    />
                </div>

                <div className="mt-10 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                    <h2 className="text-lg font-semibold text-white">
                        Aktueller Stand
                    </h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-gray-900 p-4 outline outline-1 outline-white/10">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                CV Score
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                                {summary.cvScore === null ? "--" : `${summary.cvScore}%`}
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-900 p-4 outline outline-1 outline-white/10">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                Erfolgsquote
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                                {summary.successRate === null
                                    ? "--"
                                    : `${summary.successRate}%`}
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-900 p-4 outline outline-1 outline-white/10">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                Sprache
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                                {profile.language.toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
