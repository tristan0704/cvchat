"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuickStartInterviewCardProps = {
    createErrorLabel: string;
    creatingLabel: string;
    ctaLabel: string;
    focusItems: string[];
    roleLabel: string;
    summary: string;
    templateId: string;
    title: string;
};

export function QuickStartInterviewCard({
    createErrorLabel,
    creatingLabel,
    ctaLabel,
    focusItems,
    roleLabel,
    summary,
    templateId,
    title,
}: QuickStartInterviewCardProps) {
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    async function handleStartInterview() {
        setCreating(true);
        setError("");

        try {
            const response = await fetch("/api/interviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    templateId,
                }),
            });
            const data = (await response.json().catch(() => null)) as
                | { interview?: { id: string }; error?: string }
                | null;

            if (!response.ok || !data?.interview?.id) {
                throw new Error(data?.error || createErrorLabel);
            }

            router.push(`/interviews/${data.interview.id}`);
        } catch (startError) {
            setError(
                startError instanceof Error
                    ? startError.message
                    : createErrorLabel
            );
        } finally {
            setCreating(false);
        }
    }

    return (
        <article className="flex min-h-full flex-col rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
            <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                    {roleLabel}
                </p>
                <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-300">{summary}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                    {focusItems.map((item) => (
                        <span
                            key={item}
                            className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10"
                        >
                            {item}
                        </span>
                    ))}
                </div>
            </div>

            {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}

            <button
                type="button"
                onClick={() => void handleStartInterview()}
                disabled={creating}
                className="mt-6 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {creating ? creatingLabel : ctaLabel}
            </button>
        </article>
    );
}
