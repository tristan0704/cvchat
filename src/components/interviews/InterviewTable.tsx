"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import DeleteDialog from "@/components/ui/DeleteDialog";
import { useI18n } from "@/lib/i18n/context";
import type { AppDictionary } from "@/lib/i18n/dictionaries";

type InterviewStatus =
    | "draft"
    | "ready"
    | "in_progress"
    | "analyzing"
    | "completed"
    | "failed"
    | "archived"
    | "cancelled";

type InterviewListItem = {
    id: string;
    title: string;
    role: string;
    status: InterviewStatus;
    currentStep: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
};

function getStatusLabel(
    status: InterviewStatus,
    labels: AppDictionary["interviews"]["status"]
) {
    switch (status) {
        case "ready":
            return labels.ready;
        case "in_progress":
            return labels.inProgress;
        case "analyzing":
            return labels.analyzing;
        case "completed":
            return labels.completed;
        case "failed":
            return labels.failed;
        case "archived":
            return labels.archived;
        case "cancelled":
            return labels.cancelled;
        default:
            return labels.draft;
    }
}

function getStatusStyle(status: InterviewStatus) {
    switch (status) {
        case "completed":
            return "bg-green-500/10 text-green-400 ring-green-500/20";
        case "in_progress":
            return "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20";
        case "ready":
            return "bg-sky-500/10 text-sky-400 ring-sky-500/20";
        case "analyzing":
            return "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20";
        case "failed":
        case "cancelled":
            return "bg-red-500/10 text-red-400 ring-red-500/20";
        default:
            return "bg-gray-500/10 text-gray-400 ring-gray-500/20";
    }
}

function formatDate(value: string | null, emptyLabel: string, language: string) {
    if (!value) {
        return emptyLabel;
    }

    return new Intl.DateTimeFormat(language === "en" ? "en-US" : "de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export default function InterviewTable({
    initialInterviews,
}: {
    initialInterviews?: InterviewListItem[];
}) {
    const { dictionary, language } = useI18n();
    const labels = dictionary.interviews;
    const [interviews, setInterviews] =
        useState<InterviewListItem[]>(initialInterviews ?? []);
    const [loading, setLoading] = useState(!initialInterviews);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (initialInterviews) {
            return;
        }

        let cancelled = false;

        async function hydrateInterviews() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch("/api/interviews", {
                    method: "GET",
                    cache: "no-store",
                });
                const data = (await response.json().catch(() => null)) as
                    | { interviews?: InterviewListItem[]; error?: string }
                    | null;

                if (!response.ok || !data?.interviews) {
                    throw new Error(
                        data?.error || labels.loadError
                    );
                }

                if (!cancelled) {
                    setInterviews(data.interviews);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : labels.loadError
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void hydrateInterviews();

        return () => {
            cancelled = true;
        };
    }, [initialInterviews, labels.loadError]);

    async function handleDelete() {
        if (!selectedId) {
            return;
        }

        try {
            const response = await fetch(`/api/interviews/${selectedId}`, {
                method: "DELETE",
            });
            const data = (await response.json().catch(() => null)) as
                | { ok?: boolean; error?: string }
                | null;

            if (!response.ok || !data?.ok) {
                throw new Error(
                    data?.error || labels.deleteError
                );
            }

            setInterviews((currentItems) =>
                currentItems.filter((item) => item.id !== selectedId)
            );
            setOpen(false);
            setSelectedId(null);
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : labels.deleteError
            );
        }
    }

    if (loading) {
        return (
            <div className="rounded-xl bg-gray-800/50 p-6 text-sm text-gray-400 outline outline-1 outline-white/10">
                {labels.loading}
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
            <h2 className="mb-4 text-lg font-semibold text-white">{labels.tableTitle}</h2>

            {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-white/10 text-gray-400">
                        <tr>
                            <th className="px-4 py-3 text-left">{labels.columnTitle}</th>
                            <th className="px-4 py-3 text-left">{labels.columnRole}</th>
                            <th className="px-4 py-3 text-left">{labels.columnStartedAt}</th>
                            <th className="px-4 py-3 text-left">{labels.columnStatus}</th>
                            <th className="px-4 py-3 text-right">{labels.columnAction}</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                        {interviews.length > 0 ? (
                            interviews.map((item) => (
                                <tr key={item.id} className="transition hover:bg-white/5">
                                    <td className="px-4 py-3 font-medium text-white">
                                        {item.title}
                                    </td>

                                    <td className="px-4 py-3 text-gray-300">
                                        {item.role}
                                    </td>

                                    <td className="px-4 py-3 text-gray-400">
                                        {formatDate(
                                            item.startedAt ?? item.createdAt,
                                            labels.notStarted,
                                            language
                                        )}
                                    </td>

                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(
                                                item.status
                                            )}`}
                                        >
                                            {getStatusLabel(item.status, labels.status)}
                                        </span>
                                    </td>

                                    <td className="flex justify-end gap-2 px-4 py-3 text-right">
                                        <Link
                                            href={`/interviews/${item.id}`}
                                            className="rounded-md bg-indigo-500/10 px-3 py-1 text-xs text-indigo-400 hover:bg-indigo-500/20"
                                        >
                                            {labels.open}
                                        </Link>

                                        <button
                                            onClick={() => {
                                                setSelectedId(item.id);
                                                setOpen(true);
                                            }}
                                            className="rounded-md bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20"
                                        >
                                            {labels.delete}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-sm text-gray-400"
                                >
                                    {labels.empty}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <DeleteDialog
                open={open}
                onClose={() => setOpen(false)}
                onConfirm={() => void handleDelete()}
            />
        </div>
    );
}
