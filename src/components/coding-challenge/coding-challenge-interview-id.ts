"use client";

export function getCodingChallengeInterviewId(
  param: string | string[] | undefined
) {
  if (Array.isArray(param)) {
    return param[0] ?? "standalone";
  }

  return param ?? "standalone";
}
