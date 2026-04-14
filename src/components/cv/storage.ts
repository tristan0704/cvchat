"use client";

import type { CvFeedbackResult, InterviewCvConfig } from "@/components/cv/types";

const STORAGE_PREFIX = "cvFeedbackResult:";

function normalizeStoragePart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function buildCvFeedbackStorageKey(config: InterviewCvConfig) {
  return [
    STORAGE_PREFIX,
    normalizeStoragePart(config.role || "backend-developer"),
    normalizeStoragePart(config.experience || "default"),
    normalizeStoragePart(config.companySize || "default"),
    normalizeStoragePart(config.interviewType || "default"),
  ].join("|");
}

export function loadCvFeedbackResult(
  config: InterviewCvConfig,
  cvFingerprint: string
) {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(
    `${buildCvFeedbackStorageKey(config)}|${cvFingerprint}`
  );
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CvFeedbackResult;
  } catch {
    return null;
  }
}

export function persistCvFeedbackResult(
  config: InterviewCvConfig,
  cvFingerprint: string,
  result: CvFeedbackResult
) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    `${buildCvFeedbackStorageKey(config)}|${cvFingerprint}`,
    JSON.stringify(result)
  );
}
