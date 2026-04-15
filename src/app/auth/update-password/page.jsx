"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/db-backend/auth/browser-client";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();

        if (!password || !confirmPassword) {
            setError("Bitte beide Passwortfelder ausfuellen.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Die Passwoerter stimmen nicht ueberein.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const supabase = createClient();
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Die Reset-Session ist ungueltig oder bereits abgelaufen."
                );
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password,
            });

            if (updateError) {
                throw updateError;
            }

            router.push(
                "/auth/login?message=" +
                    encodeURIComponent("Passwort erfolgreich aktualisiert.")
            );
            router.refresh();
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Passwort konnte nicht aktualisiert werden."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gray-900 px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <Image
                    src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                    width={40}
                    height={40}
                    className="mx-auto h-10 w-auto"
                    alt="Logo"
                />

                <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-white">
                    Neues Passwort setzen
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error ? (
                        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-sm font-medium text-gray-100">
                            Neues Passwort
                        </label>

                        <div className="mt-2">
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-100">
                            Passwort bestaetigen
                        </label>

                        <div className="mt-2">
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                required
                                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-x-6 items-stretch">
                        <Link
                            href="/auth/login"
                            className="flex w-full items-center justify-center rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
                        >
                            Zurueck
                        </Link>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Speichere..." : "Passwort speichern"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
