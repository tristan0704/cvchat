"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/db-backend/auth/browser-client";

export default function ResetPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError("");
        setStatus("");

        try {
            const supabase = createClient();
            const redirectTo = `${window.location.origin}/auth/update-password`;
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                email.trim(),
                {
                    redirectTo,
                }
            );

            if (resetError) {
                throw resetError;
            }

            setStatus("Wir haben dir einen Link zum Zurücksetzen gesendet.");
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Reset-Link konnte nicht versendet werden."
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
                    Passwort zurücksetzen
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error ? (
                        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    {status ? (
                        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                            {status}
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-sm font-medium text-gray-100">
                            E-Mail-Adresse
                        </label>

                        <div className="mt-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
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
                            Zurück
                        </Link>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Sende..." : "Link senden"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
