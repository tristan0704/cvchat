"use client";

import { useEffect, useState } from "react";

import type {
    CodingChallengeEvaluation,
    CodingChallengeEvaluationRequest,
    CodingChallengeEvaluationResponse,
    CodingChallengeRuntimeStatusSnapshot,
} from "@/lib/coding-challenge/types";
import { useI18n } from "@/lib/i18n/context";

type UseCodingChallengeSubmissionArgs = {
    interviewId: string;
    initialEvaluation?: CodingChallengeEvaluation | null;
    onStatusUpdate?: (status: CodingChallengeRuntimeStatusSnapshot) => void;
};

const FALLBACK_ERROR = "Coding-Challenge konnte nicht eingereicht werden.";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : FALLBACK_ERROR;
}

export function useCodingChallengeSubmission({
    interviewId,
    initialEvaluation = null,
    onStatusUpdate,
}: UseCodingChallengeSubmissionArgs) {
    const { language } = useI18n();
    const [evaluation, setEvaluation] =
        useState<CodingChallengeEvaluation | null>(initialEvaluation);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
        setEvaluation(initialEvaluation);
        setSubmitError("");
    }, [initialEvaluation, interviewId]);

    async function submitSolution(payload: CodingChallengeEvaluationRequest) {
        setIsSubmitting(true);
        setSubmitError("");

        try {
            const response = await fetch("/api/interview/coding-challenge", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    interviewId,
                    ...payload,
                    language,
                }),
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
            if (data.status) {
                onStatusUpdate?.(data.status);
            }
            return data;
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
        setEvaluation,
    };
}
