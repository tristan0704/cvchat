"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
    DIFFICULTY_LABELS,
    LANGUAGE_LABELS,
} from "@/lib/coding-challenge/labels";
import type {
    CodingChallengeDraft,
    CodingChallengeEvaluation,
} from "@/lib/coding-challenge/types";
import { useOptionalInterviewSession } from "@/lib/interview-session/context";
import { getInterviewSessionId } from "@/lib/interview-session/session-id";

function getScoreTone(score: number) {
    if (score >= 75) {
        return {
            badge: "bg-green-500/20 text-green-300",
            bar: "bg-green-400",
            label: "Strong",
        };
    }

    if (score >= 50) {
        return {
            badge: "bg-yellow-500/20 text-yellow-300",
            bar: "bg-yellow-400",
            label: "Mixed",
        };
    }

    return {
        badge: "bg-red-500/20 text-red-300",
        bar: "bg-red-400",
        label: "Weak",
    };
}

function ScoreCard({
    title,
    value,
    feedback,
}: {
    title: string;
    value: number;
    feedback: string;
}) {
    const tone = getScoreTone(value);

    return (
        <section className="rounded-xl border border-white/10 bg-gray-900 p-5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-200">{title}</p>
                <span className={`rounded-full px-3 py-1 text-xs ${tone.badge}`}>
                    {value}%
                </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-800">
                <div
                    className={`h-2 rounded-full ${tone.bar}`}
                    style={{ width: `${value}%` }}
                />
            </div>

            <p className="mt-3 text-sm text-gray-300">{feedback}</p>
        </section>
    );
}

function ListCard({
    title,
    items,
}: {
    title: string;
    items: string[];
}) {
    return (
        <section className="rounded-xl border border-white/10 bg-gray-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                {title}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-200">
                {items.length > 0 ? (
                    items.map((item) => <li key={item}>{item}</li>)
                ) : (
                    <li className="text-gray-500">No items available.</li>
                )}
            </ul>
        </section>
    );
}

export default function CodingChallengeFeedback() {
    const params = useParams<{ id: string }>();
    const session = useOptionalInterviewSession();
    const interviewId = getInterviewSessionId(params.id);
    const role = session?.role ?? "Backend Developer";
    const [draft, setDraft] = useState<CodingChallengeDraft | null>(null);
    const [evaluation, setEvaluation] = useState<CodingChallengeEvaluation | null>(
        null
    );
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function hydrateFeedback() {
            try {
                const searchParams = new URLSearchParams({
                    interviewId,
                    role,
                });
                const response = await fetch(
                    `/api/interview/coding-challenge?${searchParams.toString()}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );
                const data = (await response.json().catch(() => null)) as
                    | { draft?: CodingChallengeDraft; error?: string }
                    | null;

                if (!response.ok || !data?.draft) {
                    throw new Error(
                        data?.error || "Coding challenge konnte nicht geladen werden."
                    );
                }

                if (!cancelled) {
                    setDraft(data.draft);
                    setEvaluation(data.draft.evaluation ?? null);
                    setError("");
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Coding challenge konnte nicht geladen werden."
                    );
                }
            }
        }

        if (interviewId && interviewId !== "standalone") {
            void hydrateFeedback();
        }

        return () => {
            cancelled = true;
        };
    }, [interviewId, role]);

    if (error) {
        return (
            <div className="rounded-xl border border-white/10 bg-gray-900 p-6 text-sm text-red-300">
                {error}
            </div>
        );
    }

    if (!evaluation) {
        return (
            <div className="rounded-xl border border-white/10 bg-gray-900 p-6 text-sm text-gray-300">
                Submit a coding solution in step 4 to view feedback here.
            </div>
        );
    }

    const task = draft?.task;
    const overallTone = getScoreTone(evaluation.overallScore);

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-white/10 bg-gray-900 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                            {task ? <span>{task.role}</span> : null}
                            {task ? <span>{DIFFICULTY_LABELS[task.difficulty]}</span> : null}
                            {task ? <span>{LANGUAGE_LABELS[task.language]}</span> : null}
                            <span>{evaluation.passedLikely ? "Likely pass" : "Needs work"}</span>
                        </div>

                        <h2 className="text-xl font-semibold text-white">
                            {task?.name ?? "Coding challenge feedback"}
                        </h2>
                        <p className="max-w-3xl text-sm text-gray-300">
                            {evaluation.summary}
                        </p>
                    </div>

                    <div className="min-w-[180px] rounded-xl border border-white/10 bg-gray-950 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-gray-400">Overall score</p>
                            <span className={`rounded-full px-3 py-1 text-xs ${overallTone.badge}`}>
                                {overallTone.label}
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-white">
                            {evaluation.overallScore}%
                        </p>
                        <div className="mt-3 h-2 rounded-full bg-gray-800">
                            <div
                                className={`h-2 rounded-full ${overallTone.bar}`}
                                style={{ width: `${evaluation.overallScore}%` }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                <ScoreCard
                    title="Correctness"
                    value={evaluation.correctness.score}
                    feedback={evaluation.correctness.feedback}
                />
                <ScoreCard
                    title="Code Quality"
                    value={evaluation.codeQuality.score}
                    feedback={evaluation.codeQuality.feedback}
                />
                <ScoreCard
                    title="Problem Solving"
                    value={evaluation.problemSolving.score}
                    feedback={evaluation.problemSolving.feedback}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <ListCard title="Strengths" items={evaluation.strengths} />
                <ListCard title="Issues" items={evaluation.issues} />
                <ListCard title="Improvements" items={evaluation.improvements} />
            </div>
        </div>
    );
}
