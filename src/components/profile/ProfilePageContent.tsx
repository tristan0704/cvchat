"use client";

import { useEffect, useState, type ChangeEvent } from "react";

import {
    PROFILE_CV_MAX_FILE_BYTES,
    loadStoredProfileCv,
    saveStoredProfileCv,
    type StoredProfileCvRecord,
} from "@/lib/profile-cv-storage";

function formatUploadDate(value: string) {
    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatFileSize(bytes: number) {
    const megabytes = bytes / 1_000_000;
    return `${megabytes.toFixed(1)} MB`;
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function ProfilePageContent() {
    const [username, setUsername] = useState("maxmustermann");
    const [email, setEmail] = useState("max@mail.com");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [selectedCv, setSelectedCv] = useState<File | null>(null);
    const [currentCv, setCurrentCv] = useState<StoredProfileCvRecord | null>(null);
    const [currentCvUrl, setCurrentCvUrl] = useState("");
    const [loadingCv, setLoadingCv] = useState(true);
    const [savingCv, setSavingCv] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function hydrateStoredCv() {
            setLoadingCv(true);
            setError("");

            try {
                const storedCv = await loadStoredProfileCv();

                if (cancelled) return;

                setCurrentCv(storedCv);
            } catch (storageError) {
                if (cancelled) return;

                setError(
                    getErrorMessage(
                        storageError,
                        "Gespeicherter Lebenslauf konnte nicht geladen werden."
                    )
                );
            } finally {
                if (!cancelled) {
                    setLoadingCv(false);
                }
            }
        }

        void hydrateStoredCv();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!currentCv) {
            setCurrentCvUrl("");
            return;
        }

        const nextUrl = URL.createObjectURL(currentCv.file);
        setCurrentCvUrl(nextUrl);

        return () => {
            URL.revokeObjectURL(nextUrl);
        };
    }, [currentCv]);

    function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            setSelectedCv(null);
            return;
        }

        if (file.type !== "application/pdf") {
            setError("Bitte einen PDF-Lebenslauf auswaehlen.");
            setStatus("");
            setSelectedCv(null);
            return;
        }

        if (file.size > PROFILE_CV_MAX_FILE_BYTES) {
            setError("Die PDF-Datei darf maximal 20 MB gross sein.");
            setStatus("");
            setSelectedCv(null);
            return;
        }

        setError("");
        setStatus("");
        setSelectedCv(file);
    }

    async function handleSaveCv() {
        if (!selectedCv) return;

        setSavingCv(true);
        setError("");
        setStatus("");

        try {
            const storedCv = await saveStoredProfileCv(selectedCv);
            setCurrentCv(storedCv);
            setSelectedCv(null);
            setStatus("Lebenslauf gespeichert. Neue Interviews verwenden ab jetzt diesen CV.");
        } catch (storageError) {
            setError(
                getErrorMessage(
                    storageError,
                    "Lebenslauf konnte nicht gespeichert werden."
                )
            );
        } finally {
            setSavingCv(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">Profil</h1>
                <p className="mt-2 text-gray-400">
                    Verwalte deine persoenlichen Daten
                </p>

                <div className="mt-8 space-y-6 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                    <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"
                            className="h-16 w-16 rounded-full object-cover"
                            alt="Profilbild"
                        />
                        <div>
                            <label className="mb-1 block text-sm text-gray-400">
                                Profilbild
                            </label>
                            <input
                                type="file"
                                className="text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1 file:text-white hover:file:bg-indigo-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-gray-400">
                            Benutzername
                        </label>
                        <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-gray-400">Email</label>
                        <input
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-gray-400">
                            Neues Passwort
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="********"
                            className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-gray-400">
                            Passwort wiederholen
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="********"
                            className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-400">Lebenslauf</p>
                            <p className="mt-1 text-xs text-gray-500">
                                Dieser CV wird fuer jedes neue Interview-Feedback
                                verwendet.
                            </p>
                        </div>

                        {loadingCv ? (
                            <div className="rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-400 outline outline-1 outline-white/10">
                                Gespeicherter Lebenslauf wird geladen...
                            </div>
                        ) : currentCv ? (
                            <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3 outline outline-1 outline-white/10">
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        {currentCv.name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Gespeichert am {formatUploadDate(currentCv.uploadedAt)}
                                        {" | "}
                                        {formatFileSize(currentCv.size)}
                                    </p>
                                </div>

                                {currentCvUrl ? (
                                    <a
                                        href={currentCvUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-indigo-400 hover:text-indigo-300"
                                    >
                                        Ansehen
                                    </a>
                                ) : null}
                            </div>
                        ) : (
                            <div className="rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-400 outline outline-1 outline-white/10">
                                Noch kein Lebenslauf gespeichert.
                            </div>
                        )}

                        <div className="rounded-lg border border-dashed border-white/20 p-6 text-center">
                            <p className="mb-3 text-sm text-gray-400">
                                Neuen Lebenslauf hochladen
                            </p>

                            <input
                                id="profile-cv-upload"
                                type="file"
                                accept="application/pdf"
                                onChange={handleCvChange}
                                className="hidden"
                            />

                            <label
                                htmlFor="profile-cv-upload"
                                className="cursor-pointer rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
                            >
                                Datei auswaehlen
                            </label>

                            {selectedCv ? (
                                <p className="mt-3 text-xs text-gray-300">
                                    Ausgewaehlt: {selectedCv.name}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => void handleSaveCv()}
                                disabled={!selectedCv || savingCv}
                                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {savingCv ? "Speichere..." : "Lebenslauf speichern"}
                            </button>
                        </div>

                        {error ? <p className="text-sm text-red-400">{error}</p> : null}
                        {status ? (
                            <p className="text-sm text-emerald-400">{status}</p>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}
