"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

const PROFILE_CV_MAX_FILE_BYTES = 20_000_000;

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function RegisterStep2Form() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [selectedCv, setSelectedCv] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            setSelectedCv(null);
            return;
        }

        if (file.type !== "application/pdf") {
            setError("Bitte einen PDF-Lebenslauf auswaehlen.");
            setSelectedCv(null);
            return;
        }

        if (file.size > PROFILE_CV_MAX_FILE_BYTES) {
            setError("Die PDF-Datei darf maximal 20 MB gross sein.");
            setSelectedCv(null);
            return;
        }

        setError("");
        setSelectedCv(file);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedUsername = username.trim();

        if (!normalizedUsername) {
            setError("Bitte einen Benutzernamen eingeben.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const profileResponse = await fetch("/api/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: normalizedUsername,
                }),
            });

            const profileData = (await profileResponse.json().catch(() => null)) as
                | {
                      error?: string;
                  }
                | null;

            if (!profileResponse.ok || profileData?.error) {
                throw new Error(
                    profileData?.error || "Benutzername konnte nicht gespeichert werden."
                );
            }

            if (selectedCv) {
                const formData = new FormData();
                formData.append("file", selectedCv, selectedCv.name);

                const cvResponse = await fetch("/api/profile/cv", {
                    method: "POST",
                    body: formData,
                });

                const cvData = (await cvResponse.json().catch(() => null)) as
                    | {
                          error?: string;
                      }
                    | null;

                if (!cvResponse.ok || cvData?.error) {
                    throw new Error(
                        cvData?.error || "Lebenslauf konnte nicht gespeichert werden."
                    );
                }
            }

            router.push("/home");
            router.refresh();
        } catch (saveError) {
            setError(
                getErrorMessage(
                    saveError,
                    "Profil konnte nicht vervollstaendigt werden."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {error ? (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                ) : null}

                <div>
                    <label className="block text-sm font-medium text-gray-100">
                        Benutzername
                    </label>

                    <div className="mt-2">
                        <input
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder="deinusername"
                            className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
                        />
                    </div>
                </div>

                <div className="rounded-lg border border-dashed border-white/20 p-6 text-center">
                    <p className="mb-3 text-sm text-gray-400">
                        Lebenslauf hochladen
                    </p>

                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleCvChange}
                        className="hidden"
                        id="cv-upload"
                    />

                    <label
                        htmlFor="cv-upload"
                        className="cursor-pointer rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
                    >
                        Datei auswaehlen
                    </label>

                    {selectedCv ? (
                        <p className="mt-3 text-xs text-gray-300">
                            {selectedCv.name}
                        </p>
                    ) : (
                        <p className="mt-3 text-xs text-gray-500">
                            Optional, kann spaeter im Profil nachgetragen werden.
                        </p>
                    )}
                </div>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="flex w-full items-center justify-center rounded-md border border-white/10 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5"
                    >
                        Zurueck
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="flex w-full items-center justify-center rounded-md bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Speichere..." : "Fertig"}
                    </button>
                </div>
            </form>
        </div>
    );
}
