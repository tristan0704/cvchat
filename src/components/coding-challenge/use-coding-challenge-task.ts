"use client";

import { useEffect, useState } from "react";

import {
  loadCodingChallengeDraft,
  persistCodingChallengeDraft,
} from "@/components/coding-challenge/coding-challenge-storage";
import type {
  CodingChallengeDraft,
  PublicCodingChallengeTask,
} from "@/components/coding-challenge/coding-challenge-types";

type UseCodingChallengeTaskArgs = {
  interviewId: string;
  roleLabel: string;
};

type CodingChallengeTaskResponse = {
  task: PublicCodingChallengeTask;
};

const FALLBACK_ERROR = "Unable to load coding challenge";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : FALLBACK_ERROR;
}

async function fetchCodingChallengeTask(
  role: string,
  excludeTaskId?: string
): Promise<PublicCodingChallengeTask> {
  const searchParams = new URLSearchParams();
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

  if (!response.ok || !data?.task) {
    throw new Error(FALLBACK_ERROR);
  }

  return data.task;
}

function createDraft(task: PublicCodingChallengeTask): CodingChallengeDraft {
  return {
    task,
    code: task.starterCode,
  };
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

      const savedDraft = loadCodingChallengeDraft(interviewId);
      if (savedDraft) {
        setDraft(savedDraft);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const task = await fetchCodingChallengeTask(roleLabel);
        if (cancelled) return;

        setDraft(createDraft(task));
      } catch (error) {
        if (cancelled) return;

        setError(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTask();

    return () => {
      cancelled = true;
    };
  }, [interviewId, roleLabel]);

  useEffect(() => {
    if (!draft) return;

    persistCodingChallengeDraft(interviewId, draft);
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
    if (!draft) return;

    setIsRefreshing(true);
    setError("");

    try {
      const task = await fetchCodingChallengeTask(roleLabel, draft.task.id);
      setDraft(createDraft(task));
    } catch (error) {
      setError(getErrorMessage(error));
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
