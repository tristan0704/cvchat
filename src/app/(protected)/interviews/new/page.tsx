"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewInterviewPage() {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState("");
    const [experience, setExperience] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [type, setType] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    async function handleCreateInterview() {
        setCreating(true);
        setError("");

        try {
            const response = await fetch("/api/interviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    role,
                    experience,
                    companySize,
                    interviewType: type,
                }),
            });
            const data = (await response.json().catch(() => null)) as
                | { interview?: { id: string }; error?: string }
                | null;

            if (!response.ok || !data?.interview?.id) {
                throw new Error(
                    data?.error || "Interview konnte nicht erstellt werden."
                );
            }

            router.push(`/interviews/${data.interview.id}`);
        } catch (createError) {
            setError(
                createError instanceof Error
                    ? createError.message
                    : "Interview konnte nicht erstellt werden."
            );
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">Interview starten</h1>
                <p className="mt-4 text-gray-400">
                    Erstelle dein individuelles Interview
                </p>

                <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                    <p className="mb-4 text-sm text-gray-400">Schritt {step} von 4</p>

                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">
                                1. Zielrolle auswaehlen
                            </h2>

                            <input
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="z. B. Frontend Developer"
                                className="w-full rounded-md bg-gray-900 px-3 py-2 outline outline-1 outline-white/10 focus:outline-indigo-500"
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">
                                2. Erfahrung auswaehlen
                            </h2>

                            <div className="grid grid-cols-3 gap-3">
                                {["Junior", "Mid", "Senior"].map((lvl) => (
                                    <button
                                        key={lvl}
                                        onClick={() => setExperience(lvl)}
                                        className={`rounded-md px-4 py-2 text-sm ${
                                            experience === lvl
                                                ? "bg-indigo-500 text-white"
                                                : "bg-gray-900 hover:bg-white/5"
                                        }`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">
                                3. Unternehmensgroesse
                            </h2>

                            <div className="grid grid-cols-3 gap-3">
                                {["Startup", "Mittelstand", "Konzern"].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setCompanySize(size)}
                                        className={`rounded-md px-4 py-2 text-sm ${
                                            companySize === size
                                                ? "bg-indigo-500 text-white"
                                                : "bg-gray-900 hover:bg-white/5"
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">4. Interview Typ</h2>

                            <div className="grid gap-3">
                                {[
                                    "HR Interview",
                                    "Technical Interview",
                                    "Case Interview",
                                ].map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => setType(item)}
                                        className={`rounded-md px-4 py-2 text-sm ${
                                            type === item
                                                ? "bg-indigo-500 text-white"
                                                : "bg-gray-900 hover:bg-white/5"
                                        }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {error ? <p className="mt-6 text-sm text-red-400">{error}</p> : null}

                    <div className="mt-6 flex justify-between">
                        <button
                            onClick={() => setStep(step - 1)}
                            disabled={step === 1 || creating}
                            className="text-sm text-gray-400 hover:text-white disabled:opacity-30"
                        >
                            Zurueck
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={(step === 1 && !role.trim()) || creating}
                                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Weiter
                            </button>
                        ) : (
                            <button
                                onClick={() => void handleCreateInterview()}
                                disabled={!role.trim() || creating}
                                className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating ? "Erstelle..." : "Interview starten"}
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
