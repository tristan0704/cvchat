"use client";

import type {
  CodingChallengeDraft,
  CodingChallengeEvaluation,
} from "@/lib/coding-challenge/types";

const STORAGE_PREFIX = "codingChallengeDraft:";
const FEEDBACK_STORAGE_PREFIX = "codingChallengeFeedback:";

export function buildCodingChallengeStorageKey(interviewId: string) {
  return `${STORAGE_PREFIX}${interviewId}`;
}

export function buildCodingChallengeFeedbackStorageKey(interviewId: string) {
  return `${FEEDBACK_STORAGE_PREFIX}${interviewId}`;
}

export function loadCodingChallengeDraft(interviewId: string) {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(
    buildCodingChallengeStorageKey(interviewId)
  );
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CodingChallengeDraft;
  } catch {
    return null;
  }
}

export function persistCodingChallengeDraft(
  interviewId: string,
  draft: CodingChallengeDraft
) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    buildCodingChallengeStorageKey(interviewId),
    JSON.stringify(draft)
  );
}

export function loadCodingChallengeEvaluation(interviewId: string) {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(
    buildCodingChallengeFeedbackStorageKey(interviewId)
  );
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CodingChallengeEvaluation;
  } catch {
    return null;
  }
}

export function persistCodingChallengeEvaluation(
  interviewId: string,
  evaluation: CodingChallengeEvaluation
) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    buildCodingChallengeFeedbackStorageKey(interviewId),
    JSON.stringify(evaluation)
  );
}
