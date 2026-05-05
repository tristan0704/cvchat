"use client";

import { useEffect, useRef, useState } from "react";

import { LANGUAGE_LABELS } from "@/lib/coding-challenge/labels";
import type {
    CodingChallengeDraft,
    CodingChallengeEvaluation,
} from "@/lib/coding-challenge/types";
import { readApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n/context";
import { useInterviewSession } from "@/lib/interview-session/context";

// Dateiübersicht:
// Diese Auswertungsansicht lädt nur die Coding-Domäne. Ein In-flight-Guard
// verhindert doppelte Detail-GETs beim Mounten, damit nicht mehrere identische
// Reads mit voller Task- und Evaluation-Payload entstehen.

function getScoreTone(
    score: number,
    labels: {
        scoreStrong: string;
        scoreSolid: string;
        scoreWeak: string;
    }
) {
    if (score >= 75) {
        return {
            badge: "bg-green-500/20 text-green-300",
            bar: "bg-green-400",
            label: labels.scoreStrong,
        };
    }

    if (score >= 50) {
        return {
            badge: "bg-yellow-500/20 text-yellow-300",
            bar: "bg-yellow-400",
            label: labels.scoreSolid,
        };
    }

    return {
        badge: "bg-red-500/20 text-red-300",
        bar: "bg-red-400",
        label: labels.scoreWeak,
    };
}

function ScoreCard({
    title,
    value,
    feedback,
    toneLabels,
}: {
    title: string;
    value: number;
    feedback: string;
    toneLabels: Parameters<typeof getScoreTone>[1];
}) {
    const tone = getScoreTone(value, toneLabels);

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
                    <li className="text-gray-500">Keine Einträge vorhanden.</li>
                )}
            </ul>
        </section>
    );
}

export default function CodingChallengeFeedback() {
    const { dictionary } = useI18n();
    const session = useInterviewSession();
    const interviewId = session.interviewId;
    const [draft, setDraft] = useState<CodingChallengeDraft | null>(null);
    const [evaluation, setEvaluation] = useState<CodingChallengeEvaluation | null>(
        null
    );
    const [error, setError] = useState("");
    const hydratePromiseRef = useRef<Promise<CodingChallengeDraft> | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function hydrateFeedback() {
            try {
                const requestPromise =
                    hydratePromiseRef.current ??
                    (async () => {
                        const response = await fetch(
                            `/api/interviews/${interviewId}/coding`,
                            {
                                method: "GET",
                                cache: "no-store",
                            }
                        );
                        const data = (await response.json().catch(() => null)) as
                            | {
                                  codingChallenge?: CodingChallengeDraft | null;
                                  error?: unknown;
                                  errorMessage?: string;
                              }
                            | null;

                        if (!response.ok || !data?.codingChallenge) {
                            throw new Error(
                                readApiErrorMessage(
                                    data,
                                    "Coding-Challenge konnte nicht geladen werden."
                                )
                            );
                        }

                        return data.codingChallenge;
                    })();
                hydratePromiseRef.current = requestPromise;
                const codingChallenge = await requestPromise;

                if (!cancelled) {
                    setDraft(codingChallenge);
                    setEvaluation(codingChallenge.evaluation ?? null);
                    setError("");
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                        : "Coding-Challenge konnte nicht geladen werden."
                    );
                }
            } finally {
                hydratePromiseRef.current = null;
            }
        }

        void hydrateFeedback();

        return () => {
            cancelled = true;
        };
    }, [interviewId]);

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
                {dictionary.coding.submitFirst}
            </div>
        );
    }

    const task = draft?.task;
    const overallTone = getScoreTone(evaluation.overallScore, dictionary.common);

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-white/10 bg-gray-900 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                            {task ? <span>{task.role}</span> : null}
                            {task ? <span>{dictionary.coding.difficulty[task.difficulty]}</span> : null}
                            {task ? <span>{LANGUAGE_LABELS[task.language]}</span> : null}
                            <span>
                                {evaluation.passedLikely
                                    ? dictionary.coding.likelyMatch
                                    : dictionary.coding.needsWork}
                            </span>
                        </div>

                        <h2 className="text-xl font-semibold text-white">
                            {task?.name ?? dictionary.coding.feedbackTitle}
                        </h2>
                        <p className="max-w-3xl text-sm text-gray-300">
                            {evaluation.summary}
                        </p>
                    </div>

                    <div className="min-w-[180px] rounded-xl border border-white/10 bg-gray-950 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-gray-400">
                                {dictionary.coding.overallScore}
                            </p>
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
                    title={dictionary.coding.correctness}
                    value={evaluation.correctness.score}
                    feedback={evaluation.correctness.feedback}
                    toneLabels={dictionary.common}
                />
                <ScoreCard
                    title={dictionary.coding.codeQuality}
                    value={evaluation.codeQuality.score}
                    feedback={evaluation.codeQuality.feedback}
                    toneLabels={dictionary.common}
                />
                <ScoreCard
                    title={dictionary.coding.problemSolving}
                    value={evaluation.problemSolving.score}
                    feedback={evaluation.problemSolving.feedback}
                    toneLabels={dictionary.common}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <ListCard title={dictionary.coding.strengths} items={evaluation.strengths} />
                <ListCard title={dictionary.coding.risks} items={evaluation.issues} />
                <ListCard title={dictionary.coding.improvements} items={evaluation.improvements} />
            </div>
        </div>
    );
}
