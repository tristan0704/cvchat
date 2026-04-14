"use client"

import { useEffect, useState } from "react"

import {
    loadInterviewFeedbackEvaluation,
    persistInterviewFeedbackEvaluation,
} from "@/lib/interview-feedback/storage"
import type {
    InterviewFeedbackEvaluation,
    InterviewFeedbackRequest,
    InterviewFeedbackResponse,
} from "@/lib/interview-feedback/types"

type UseInterviewFeedbackAnalysisArgs = InterviewFeedbackRequest & {
    interviewId: string
    enabled: boolean
}

export function useInterviewFeedbackAnalysis(
    args: UseInterviewFeedbackAnalysisArgs
) {
    const [evaluation, setEvaluation] =
        useState<InterviewFeedbackEvaluation | null>(null)
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
        "idle"
    )
    const [error, setError] = useState("")

    useEffect(() => {
        const cachedEvaluation = loadInterviewFeedbackEvaluation(args.interviewId)

        if (
            cachedEvaluation &&
            cachedEvaluation.transcriptFingerprint === args.transcriptFingerprint
        ) {
            setEvaluation(cachedEvaluation)
            setStatus("ready")
            setError("")
            return
        }

        if (!args.enabled || !args.transcript.trim()) {
            setEvaluation(null)
            setStatus("idle")
            setError("")
            return
        }

        let cancelled = false

        async function evaluateInterview() {
            setStatus("loading")
            setError("")

            try {
                const response = await fetch("/api/interview/interview-feedback", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        role: args.role,
                        experience: args.experience,
                        companySize: args.companySize,
                        interviewType: args.interviewType,
                        transcript: args.transcript,
                        transcriptFingerprint: args.transcriptFingerprint,
                    } satisfies InterviewFeedbackRequest),
                })

                const data = (await response.json().catch(() => null)) as
                    | InterviewFeedbackResponse
                    | { error?: string }
                    | null

                if (!response.ok || !data || !("evaluation" in data)) {
                    throw new Error(
                        (data && "error" in data && data.error) ||
                            "Interview-Feedback konnte nicht analysiert werden."
                    )
                }

                if (cancelled) return

                persistInterviewFeedbackEvaluation(args.interviewId, data.evaluation)
                setEvaluation(data.evaluation)
                setStatus("ready")
            } catch (requestError) {
                if (cancelled) return

                setEvaluation(null)
                setStatus("error")
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Interview-Feedback konnte nicht analysiert werden."
                )
            }
        }

        void evaluateInterview()

        return () => {
            cancelled = true
        }
    }, [
        args.companySize,
        args.enabled,
        args.experience,
        args.interviewId,
        args.interviewType,
        args.role,
        args.transcript,
        args.transcriptFingerprint,
    ])

    return {
        evaluation,
        status,
        error,
    }
}
