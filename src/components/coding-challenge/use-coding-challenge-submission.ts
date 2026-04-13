"use client";

import { useEffect, useState } from "react";

import {
  loadCodingChallengeEvaluation,
  persistCodingChallengeEvaluation,
} from "@/components/coding-challenge/coding-challenge-storage";
import type {
  CodingChallengeEvaluation,
  CodingChallengeEvaluationRequest,
  CodingChallengeEvaluationResponse,
} from "@/components/coding-challenge/coding-challenge-types";

type UseCodingChallengeSubmissionArgs = {
  interviewId: string;
};

const FALLBACK_ERROR = "Unable to submit coding challenge";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : FALLBACK_ERROR;
}

export function useCodingChallengeSubmission({
  interviewId,
}: UseCodingChallengeSubmissionArgs) {
  const [evaluation, setEvaluation] =
    useState<CodingChallengeEvaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setEvaluation(loadCodingChallengeEvaluation(interviewId));
    setSubmitError("");
  }, [interviewId]);

  async function submitSolution(payload: CodingChallengeEvaluationRequest) {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/interview/coding-challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | CodingChallengeEvaluationResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("evaluation" in data) || !data.evaluation) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : FALLBACK_ERROR
        );
      }

      setEvaluation(data.evaluation);
      persistCodingChallengeEvaluation(interviewId, data.evaluation);
      return data.evaluation;
    } catch (error) {
      const message = getErrorMessage(error);
      setSubmitError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    evaluation,
    isSubmitting,
    submitError,
    submitSolution,
  };
}
