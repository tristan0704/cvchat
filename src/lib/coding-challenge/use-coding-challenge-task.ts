"use client";

import { useEffect, useState } from "react";

import type { CodingChallengeDraft } from "@/lib/coding-challenge/types";

type UseCodingChallengeTaskArgs = {
    interviewId: string;
    roleLabel: string;
};

type CodingChallengeTaskResponse = {
    draft: CodingChallengeDraft;
};

const FALLBACK_ERROR = "Unable to load coding challenge";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : FALLBACK_ERROR;
}

async function fetchCodingChallengeDraft(
    interviewId: string,
    role: string,
    excludeTaskId?: string
): Promise<CodingChallengeDraft> {
    const searchParams = new URLSearchParams();
    searchParams.set("interviewId", interviewId);
    searchParams.set("role", role);

    if (excludeTaskId) {
        searchParams.set("excludeTaskId", excludeTaskId);
    }

    const response = await fetch(
        `/api/interview/coding-challenge?${searchParams.toString()}`,
        {
            method: "GET",
            cache: "no-store",
        }
    );

    const data = (await response.json().catch(() => null)) as
        | CodingChallengeTaskResponse
        | null;

    if (!response.ok || !data?.draft) {
        throw new Error(FALLBACK_ERROR);
    }

    return data.draft;
}

async function persistDraft(interviewId: string, draft: CodingChallengeDraft) {
    await fetch("/api/interview/coding-challenge", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            interviewId,
            attemptId: draft.attemptId,
            code: draft.code,
        }),
    });
}

export function useCodingChallengeTask({
    interviewId,
    roleLabel,
}: UseCodingChallengeTaskArgs) {
    const [draft, setDraft] = useState<CodingChallengeDraft | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadTask() {
            setError("");
            setIsLoading(true);

            try {
                const nextDraft = await fetchCodingChallengeDraft(
                    interviewId,
                    roleLabel
                );
                if (!cancelled) {
                    setDraft(nextDraft);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(getErrorMessage(loadError));
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        if (interviewId && interviewId !== "standalone") {
            void loadTask();
        } else {
            setIsLoading(false);
            setError("Coding challenge requires a persisted interview.");
        }

        return () => {
            cancelled = true;
        };
    }, [interviewId, roleLabel]);

    useEffect(() => {
        if (!draft || !interviewId || interviewId === "standalone") {
            return;
        }

        const timeout = window.setTimeout(() => {
            void persistDraft(interviewId, draft).catch(() => undefined);
        }, 400);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [draft, interviewId]);

    function updateCode(value: string | undefined) {
        setDraft((currentDraft) =>
            currentDraft
                ? {
                      ...currentDraft,
                      code: value ?? "",
                  }
                : currentDraft
        );
    }

    function resetCode() {
        setDraft((currentDraft) =>
            currentDraft
                ? {
                      ...currentDraft,
                      code: currentDraft.task.starterCode,
                  }
                : currentDraft
        );
    }

    async function loadNewTask() {
        if (!draft) {
            return;
        }

        setIsRefreshing(true);
        setError("");

        try {
            const nextDraft = await fetchCodingChallengeDraft(
                interviewId,
                roleLabel,
                draft.task.id
            );
            setDraft(nextDraft);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setIsRefreshing(false);
        }
    }

    return {
        draft,
        error,
        isLoading,
        isRefreshing,
        loadNewTask,
        resetCode,
        updateCode,
    };
}
