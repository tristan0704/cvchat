"use client";

import { useEffect, useState } from "react";

import type {
    InterviewFeedbackEvaluation,
    InterviewFeedbackRequest,
    InterviewFeedbackResponse,
} from "@/lib/interview-feedback-fetch/types";
import { normalizeLanguage } from "@/lib/i18n/dictionaries";

type UseInterviewFeedbackAnalysisArgs = InterviewFeedbackRequest & {
    interviewId: string;
    enabled: boolean;
    existingEvaluation?: InterviewFeedbackEvaluation | null;
};

export function useInterviewFeedbackAnalysis(
    args: UseInterviewFeedbackAnalysisArgs
) {
    const languageAwareFingerprint = `${args.transcriptFingerprint}:${normalizeLanguage(args.language)}`;
    const [evaluation, setEvaluation] =
        useState<InterviewFeedbackEvaluation | null>(
            args.existingEvaluation ?? null
        );
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
        args.existingEvaluation ? "ready" : "idle"
    );
    const [error, setError] = useState("");

    useEffect(() => {
        if (
            args.existingEvaluation &&
            args.existingEvaluation.transcriptFingerprint === languageAwareFingerprint
        ) {
            setEvaluation(args.existingEvaluation);
            setStatus("ready");
            setError("");
            return;
        }

        if (!args.enabled || !args.transcript.trim()) {
            setEvaluation(args.existingEvaluation ?? null);
            setStatus(args.existingEvaluation ? "ready" : "idle");
            setError("");
            return;
        }

        let cancelled = false;

        async function evaluateInterview() {
            setStatus("loading");
            setError("");

            try {
                const response = await fetch("/api/interview/interview-feedback", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        interviewId: args.interviewId,
                        role: args.role,
                        experience: args.experience,
                        companySize: args.companySize,
                        transcript: args.transcript,
                        transcriptFingerprint: args.transcriptFingerprint,
                        language: args.language,
                    }),
                });

                const data = (await response.json().catch(() => null)) as
                    | InterviewFeedbackResponse
                    | { error?: string }
                    | null;

                if (!response.ok || !data || !("evaluation" in data)) {
                    throw new Error(
                        (data && "error" in data && data.error) ||
                            "Interview-Feedback konnte nicht analysiert werden."
                    );
                }

                if (cancelled) {
                    return;
                }

                setEvaluation(data.evaluation);
                setStatus("ready");
            } catch (requestError) {
                if (cancelled) {
                    return;
                }

                setEvaluation(args.existingEvaluation ?? null);
                setStatus("error");
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Interview-Feedback konnte nicht analysiert werden."
                );
            }
        }

        void evaluateInterview();

        return () => {
            cancelled = true;
        };
    }, [
        args.companySize,
        args.enabled,
        args.existingEvaluation,
        args.experience,
        args.interviewId,
        args.language,
        args.role,
        args.transcript,
        args.transcriptFingerprint,
        languageAwareFingerprint,
    ]);

    return {
        evaluation,
        status,
        error,
    };
}
