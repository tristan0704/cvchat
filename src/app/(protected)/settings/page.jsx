"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getErrorMessage(error, fallback) {
    return error instanceof Error ? error.message : fallback;
}

export default function SettingsPage() {
    const router = useRouter();
    const [deletePassword, setDeletePassword] = useState("");
    const [notifications, setNotifications] = useState(true);
    const [language, setLanguage] = useState("de");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function hydrateSettings() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch("/api/settings", {
                    method: "GET",
                    cache: "no-store",
                });
                const data = await response.json().catch(() => null);

                if (!response.ok || !data) {
                    throw new Error("Einstellungen konnten nicht geladen werden.");
                }

                if (cancelled) {
                    return;
                }

                setNotifications(Boolean(data.emailNotifications));
                setLanguage(
                    typeof data.language === "string" ? data.language : "de"
                );
            } catch (settingsError) {
                if (!cancelled) {
                    setError(
                        getErrorMessage(
                            settingsError,
                            "Einstellungen konnten nicht geladen werden."
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void hydrateSettings();

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSaveSettings() {
        setSaving(true);
        setError("");
        setStatus("");

        try {
            const response = await fetch("/api/settings", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    language,
                    emailNotifications: notifications,
                }),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data) {
                throw new Error("Einstellungen konnten nicht gespeichert werden.");
            }

            setStatus(data.message || "Einstellungen gespeichert.");
        } catch (settingsError) {
            setError(
                getErrorMessage(
                    settingsError,
                    "Einstellungen konnten nicht gespeichert werden."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAccount() {
        const confirmed = window.confirm(
            "Willst du deinen Account wirklich dauerhaft loeschen?"
        );

        if (!confirmed) {
            return;
        }

        setDeletingAccount(true);
        setError("");
        setStatus("");

        try {
            const response = await fetch("/api/account", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    password: deletePassword,
                }),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data) {
                throw new Error(
                    data?.error || "Account konnte nicht geloescht werden."
                );
            }

            setDeletePassword("");
            router.push("/auth/login?message=Account%20geloescht.");
            router.refresh();
        } catch (deleteError) {
            setError(
                getErrorMessage(
                    deleteError,
                    "Account konnte nicht geloescht werden."
                )
            );
        } finally {
            setDeletingAccount(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">Einstellungen</h1>
                <p className="mt-2 text-gray-400">Passe deine App-Erfahrung an</p>

                <div className="mt-8 space-y-6">
                    {loading ? (
                        <div className="rounded-xl bg-gray-800/50 p-4 text-sm text-gray-400 outline outline-1 outline-white/10">
                            Einstellungen werden geladen...
                        </div>
                    ) : null}

                    <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 space-y-4">
                        <h2 className="text-lg font-semibold">Allgemein</h2>

                        <div>
                            <label className="mb-1 block text-sm text-gray-400">
                                Sprache
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
                            >
                                <option value="de">Deutsch</option>
                                <option value="en">Englisch</option>
                            </select>
                        </div>
                    </div>

                    <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 space-y-4">
                        <h2 className="text-lg font-semibold">Benachrichtigungen</h2>

                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-300">
                                Email Benachrichtigungen
                            </p>
                            <button
                                onClick={() => setNotifications(!notifications)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                    notifications ? "bg-indigo-500" : "bg-gray-600"
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                        notifications
                                            ? "translate-x-6"
                                            : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl bg-red-500/10 p-6 outline outline-1 outline-red-500/20 space-y-4">
                        <h2 className="text-lg font-semibold text-red-400">Account</h2>

                        <div>
                            <label className="mb-1 block text-sm text-red-200">
                                Passwort bestaetigen
                            </label>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(event) => setDeletePassword(event.target.value)}
                                className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-red-500/20 focus:outline-red-400"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleDeleteAccount()}
                            disabled={deletingAccount || !deletePassword}
                            className="w-full rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {deletingAccount
                                ? "Account wird geloescht..."
                                : "Account loeschen"}
                        </button>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => void handleSaveSettings()}
                            disabled={loading || saving}
                            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? "Speichere..." : "Einstellungen speichern"}
                        </button>
                    </div>

                    {error ? <p className="text-sm text-red-400">{error}</p> : null}
                    {status ? (
                        <p className="text-sm text-emerald-400">{status}</p>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
