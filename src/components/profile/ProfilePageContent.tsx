"use client";

import { useState, type ChangeEvent } from "react";

const PROFILE_CV_MAX_FILE_BYTES = 20_000_000;
const PROFILE_AVATAR_MAX_FILE_BYTES = 5_000_000;
const PROFILE_AVATAR_MIME_TYPES = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

type ActiveCvSummary = {
    id: string;
    fileName: string;
    fileSizeBytes: number | null;
    mimeType: string | null;
    uploadedAt: string;
};

type ProfileSnapshot = {
    email: string;
    username: string;
    avatarUrl: string | null;
    language: string;
    emailNotifications: boolean;
    activeCv: ActiveCvSummary | null;
};

function formatUploadDate(value: string) {
    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatFileSize(bytes: number | null) {
    if (!bytes) {
        return "Unbekannte Dateigröße";
    }

    const megabytes = bytes / 1_000_000;
    return `${megabytes.toFixed(1)} MB`;
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

type ProfilePageContentProps = {
    initialProfile: ProfileSnapshot;
};

export default function ProfilePageContent({
    initialProfile,
}: ProfilePageContentProps) {
    const [username, setUsername] = useState(initialProfile.username);
    const [email, setEmail] = useState(initialProfile.email);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(
        initialProfile.avatarUrl
    );
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [selectedCv, setSelectedCv] = useState<File | null>(null);
    const [currentCv, setCurrentCv] = useState<ActiveCvSummary | null>(
        initialProfile.activeCv
    );
    const [loadingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [savingCv, setSavingCv] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            setSelectedCv(null);
            return;
        }

        if (file.type !== "application/pdf") {
            setError("Bitte einen PDF-Lebenslauf auswählen.");
            setStatus("");
            setSelectedCv(null);
            return;
        }

        if (file.size > PROFILE_CV_MAX_FILE_BYTES) {
            setError("Die PDF-Datei darf maximal 20 MB groß sein.");
            setStatus("");
            setSelectedCv(null);
            return;
        }

        setError("");
        setStatus("");
        setSelectedCv(file);
    }

    async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        if (!PROFILE_AVATAR_MIME_TYPES.has(file.type)) {
            setError("Bitte ein Bild als PNG, JPG, WEBP oder GIF auswählen.");
            setStatus("");
            return;
        }

        if (file.size > PROFILE_AVATAR_MAX_FILE_BYTES) {
            setError("Das Profilbild darf maximal 5 MB groß sein.");
            setStatus("");
            return;
        }

        setSavingAvatar(true);
        setError("");
        setStatus("");

        try {
            const formData = new FormData();
            formData.append("file", file, file.name);

            const response = await fetch("/api/profile/avatar", {
                method: "POST",
                body: formData,
            });

            const data = (await response.json().catch(() => null)) as
                | {
                      message?: string;
                      error?: string;
                      avatarUrl?: string | null;
                  }
                | null;

            if (!response.ok || !data || data.error) {
                throw new Error(
                    data?.error || "Profilbild konnte nicht gespeichert werden."
                );
            }

            setAvatarUrl(data.avatarUrl ?? null);
            setStatus(data.message || "Profilbild gespeichert.");
        } catch (avatarError) {
            setError(
                getErrorMessage(
                    avatarError,
                    "Profilbild konnte nicht gespeichert werden."
                )
            );
        } finally {
            event.target.value = "";
            setSavingAvatar(false);
        }
    }

    async function handleSaveProfile() {
        setSavingProfile(true);
        setError("");
        setStatus("");

        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    confirmPassword,
                }),
            });

            const data = (await response.json().catch(() => null)) as
                | {
                      message?: string;
                      error?: string;
                      profile?: ProfileSnapshot;
                  }
                | null;

            if (!response.ok || !data || data.error) {
                throw new Error(data?.error || "Profil konnte nicht gespeichert werden.");
            }

            if (data.profile) {
                setUsername(data.profile.username);
                setEmail(data.profile.email);
                setAvatarUrl(data.profile.avatarUrl);
                setCurrentCv(data.profile.activeCv);
            }

            setPassword("");
            setConfirmPassword("");
            setStatus(data.message || "Profil gespeichert.");
        } catch (profileError) {
            setError(
                getErrorMessage(
                    profileError,
                    "Profil konnte nicht gespeichert werden."
                )
            );
        } finally {
            setSavingProfile(false);
        }
    }

    async function handleSaveCv() {
        if (!selectedCv) {
            return;
        }

        setSavingCv(true);
        setError("");
        setStatus("");

        try {
            const formData = new FormData();
            formData.append("file", selectedCv, selectedCv.name);

            const response = await fetch("/api/profile/cv", {
                method: "POST",
                body: formData,
            });

            const data = (await response.json().catch(() => null)) as
                | {
                      message?: string;
                      error?: string;
                      cv?: ActiveCvSummary;
                  }
                | null;

            if (!response.ok || !data || data.error || !data.cv) {
                throw new Error(
                    data?.error || "Lebenslauf konnte nicht gespeichert werden."
                );
            }

            setCurrentCv(data.cv);
            setSelectedCv(null);
            setStatus(
                data.message ||
                    "Lebenslauf gespeichert. Neue Interviews verwenden ab jetzt diesen CV."
            );
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

    const avatarFallback =
        username.trim().charAt(0).toUpperCase() ||
        email.trim().charAt(0).toUpperCase() ||
        "?";

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">Profil</h1>
                <p className="mt-2 text-gray-400">
                    Verwalte deine persönlichen Daten
                </p>

                <div className="mt-8 space-y-6 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                    <div className="flex items-center gap-4">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarUrl}
                                className="h-16 w-16 rounded-full object-cover"
                                alt="Profilbild"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500 text-lg font-semibold text-white">
                                {avatarFallback}
                            </div>
                        )}
                        <div>
                            <label className="mb-1 block text-sm text-gray-400">
                                Profilbild
                            </label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={handleAvatarChange}
                                className="text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1 file:text-white hover:file:bg-indigo-400"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {savingAvatar
                                    ? "Profilbild wird gespeichert..."
                                    : "PNG, JPG, WEBP oder GIF bis 5 MB"}
                            </p>
                        </div>
                    </div>

                    {loadingProfile ? (
                        <div className="rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-400 outline outline-1 outline-white/10">
                            Profil wird geladen...
                        </div>
                    ) : null}

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

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => void handleSaveProfile()}
                            disabled={loadingProfile || savingProfile}
                            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingProfile ? "Speichere..." : "Profil speichern"}
                        </button>
                    </div>

                    <div className="space-y-4 border-t border-white/10 pt-6">
                        <div>
                            <p className="text-sm text-gray-400">Lebenslauf</p>
                            <p className="mt-1 text-xs text-gray-500">
                                Dieser CV wird für jedes neue Interview-Feedback
                                verwendet.
                            </p>
                        </div>

                        {currentCv ? (
                            <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3 outline outline-1 outline-white/10">
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        {currentCv.fileName}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Gespeichert am {formatUploadDate(currentCv.uploadedAt)}
                                        {" | "}
                                        {formatFileSize(currentCv.fileSizeBytes)}
                                    </p>
                                </div>
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
                                Datei auswählen
                            </label>

                            {selectedCv ? (
                                <p className="mt-3 text-xs text-gray-300">
                                    Ausgewählt: {selectedCv.name}
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
