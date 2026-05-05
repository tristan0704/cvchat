"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n/context";

function getErrorMessage(error, fallback) {
    return error instanceof Error ? error.message : fallback;
}

export default function SettingsPageContent({ initialSettings }) {
    const { dictionary } = useI18n();
    const labels = dictionary.settings;
    const router = useRouter();
    const [deletePassword, setDeletePassword] = useState("");
    const [notifications, setNotifications] = useState(
        Boolean(initialSettings.emailNotifications)
    );
    const [language, setLanguage] = useState(
        typeof initialSettings.language === "string"
            ? initialSettings.language
            : "de"
    );
    const [loading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

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
                throw new Error(labels.saveError);
            }

            setStatus(labels.saved);
            router.refresh();
        } catch (settingsError) {
            setError(
                getErrorMessage(
                    settingsError,
                    labels.saveError
                )
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAccount() {
        const confirmed = window.confirm(
            labels.deleteConfirm
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
                    data?.error || labels.deleteError
                );
            }

            setDeletePassword("");
            router.push(
                "/auth/login?message=" + encodeURIComponent(labels.deletedMessage)
            );
            router.refresh();
        } catch (deleteError) {
            setError(
                getErrorMessage(
                    deleteError,
                    labels.deleteError
                )
            );
        } finally {
            setDeletingAccount(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">{labels.title}</h1>
                <p className="mt-2 text-gray-400">{labels.description}</p>

                <div className="mt-8 space-y-6">
                    {loading ? (
                        <div className="rounded-xl bg-gray-800/50 p-4 text-sm text-gray-400 outline outline-1 outline-white/10">
                            {labels.loading}
                        </div>
                    ) : null}

                    <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 space-y-4">
                        <h2 className="text-lg font-semibold">{labels.general}</h2>

                        <div>
                            <label className="mb-1 block text-sm text-gray-400">
                                {labels.language}
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
                            >
                                <option value="de">{labels.german}</option>
                                <option value="en">{labels.english}</option>
                            </select>
                        </div>
                    </div>

                    <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 space-y-4">
                        <h2 className="text-lg font-semibold">{labels.notifications}</h2>

                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-300">
                                {labels.emailNotifications}
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
                        <h2 className="text-lg font-semibold text-red-400">{labels.account}</h2>

                        <div>
                            <label className="mb-1 block text-sm text-red-200">
                                {labels.confirmPassword}
                            </label>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(event) => setDeletePassword(event.target.value)}
                                className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-red-500/20 focus:outline-red-400"
                            />
                        </div>

                        <button
                            onClick={() => void handleDeleteAccount()}
                            // Ohne Passwort soll kein sicher vermeidbarer
                            // Fehler-Request für die Account-Löschung starten.
                            disabled={deletingAccount || !deletePassword.trim()}
                            className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {deletingAccount
                                ? labels.deletingAccount
                                : labels.deleteAccount}
                        </button>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => void handleSaveSettings()}
                            disabled={saving}
                            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? labels.saving : labels.saveSettings}
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
