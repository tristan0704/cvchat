"use client";

import { useEffect, useRef, useState } from "react";

import type {
    CodingChallengeDraft,
    CodingChallengeRuntimeStatusSnapshot,
} from "@/lib/coding-challenge/types";
import { useI18n } from "@/lib/i18n/context";

// Dateiübersicht:
// Der Hook weist genau eine Coding-Challenge pro Interview/Rolle zu und speichert
// Drafts verzögert. Die initiale Assignment-Anfrage wird dedupliziert, weil sie
// sonst bei Remounts mehrere gleichwertige GETs auslösen kann.

type UseCodingChallengeTaskArgs = {
    interviewId: string;
    roleLabel: string;
    onStatusUpdate?: (status: CodingChallengeRuntimeStatusSnapshot) => void;
};

type CodingChallengeTaskResponse = {
    draft: CodingChallengeDraft;
    status?: CodingChallengeRuntimeStatusSnapshot | null;
};

const FALLBACK_ERROR = "Coding-Challenge konnte nicht geladen werden.";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : FALLBACK_ERROR;
}

async function fetchCodingChallengeDraft(
    interviewId: string,
    role: string,
    language: string,
    excludeTaskId?: string
): Promise<CodingChallengeTaskResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("interviewId", interviewId);
    searchParams.set("role", role);
    searchParams.set("language", language);

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

    return data;
}

async function persistDraft(
    interviewId: string,
    draft: CodingChallengeDraft,
    language: string
) {
    await fetch("/api/interview/coding-challenge", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            interviewId,
            attemptId: draft.attemptId,
            code: draft.code,
            language,
        }),
    });
}

export function useCodingChallengeTask({
    interviewId,
    onStatusUpdate,
    roleLabel,
}: UseCodingChallengeTaskArgs) {
    const { language } = useI18n();
    const [draft, setDraft] = useState<CodingChallengeDraft | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");
    const loadPromiseRef = useRef<{
        key: string;
        promise: Promise<CodingChallengeTaskResponse>;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadKey = `${interviewId}:${roleLabel}:${language}`;

        async function loadTask() {
            setError("");
            setIsLoading(true);

            try {
                const request =
                    loadPromiseRef.current?.key === loadKey
                        ? loadPromiseRef.current
                        : {
                              key: loadKey,
                              promise: fetchCodingChallengeDraft(
                                  interviewId,
                                  roleLabel,
                                  language
                              ),
                          };
                loadPromiseRef.current = request;
                const response = await request.promise;
                if (!cancelled) {
                    setDraft(response.draft);
                    if (response.status) {
                        onStatusUpdate?.(response.status);
                    }
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(getErrorMessage(loadError));
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
                if (loadPromiseRef.current?.key === loadKey) {
                    loadPromiseRef.current = null;
                }
            }
        }

        if (interviewId) {
            void loadTask();
        } else {
            setIsLoading(false);
            setError("Die Coding-Challenge benötigt ein gespeichertes Interview.");
        }

        return () => {
            cancelled = true;
        };
    }, [interviewId, language, onStatusUpdate, roleLabel]);

    useEffect(() => {
        if (!draft || !interviewId) {
            return;
        }

        const timeout = window.setTimeout(() => {
            void persistDraft(interviewId, draft, language).catch(() => undefined);
        }, 400);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [draft, interviewId, language]);

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
            const response = await fetchCodingChallengeDraft(
                interviewId,
                roleLabel,
                language,
                draft.task.id
            );
            setDraft(response.draft);
            if (response.status) {
                onStatusUpdate?.(response.status);
            }
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
