import "server-only";

import type {
    InterviewMode,
    InterviewStatus,
    InterviewTranscriptStatus,
} from "@prisma/client";

import { db } from "@/db-backend/prisma/client";

export type InterviewStatusSnapshot = {
    id: string;
    currentStep: number;
    status: InterviewStatus;
    startedAt: string | null;
    completedAt: string | null;
    interviewMode: InterviewMode | null;
    transcriptStatus: InterviewTranscriptStatus | null;
    transcriptError: string;
    hasCvFeedback: boolean;
    hasInterviewFeedback: boolean;
    hasOverallFeedback: boolean;
    hasCodingEvaluation: boolean;
    statusVersion: number;
    lastActivityAt: string;
};

export const interviewRuntimeStatusSelect = {
    id: true,
    currentStep: true,
    status: true,
    startedAt: true,
    completedAt: true,
    interviewMode: true,
    runtimeTranscriptStatus: true,
    runtimeTranscriptError: true,
    hasCvFeedback: true,
    hasInterviewFeedback: true,
    hasOverallFeedback: true,
    hasCodingEvaluation: true,
    statusVersion: true,
    lastActivityAt: true,
} as const;

type InterviewRuntimeStatusRow = {
    id: string;
    currentStep: number;
    status: InterviewStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    interviewMode: InterviewMode | null;
    runtimeTranscriptStatus: InterviewTranscriptStatus | null;
    runtimeTranscriptError: string | null;
    hasCvFeedback: boolean;
    hasInterviewFeedback: boolean;
    hasOverallFeedback: boolean;
    hasCodingEvaluation: boolean;
    statusVersion: number;
    lastActivityAt: Date;
};

export function resolveStatusForStep(step: number): InterviewStatus {
    if (step >= 6) {
        return "completed";
    }

    if (step >= 2) {
        return "in_progress";
    }

    return "ready";
}

export function resolveMaxAccessibleStep(args: {
    hasCvFeedback: boolean;
    transcriptStatus: InterviewTranscriptStatus | null;
    hasInterviewFeedback: boolean;
    hasCodingEvaluation: boolean;
}) {
    if (args.hasCodingEvaluation) {
        return 6;
    }

    if (args.hasInterviewFeedback) {
        return 4;
    }

    if (args.transcriptStatus && args.transcriptStatus !== "idle") {
        return 3;
    }

    if (args.hasCvFeedback) {
        return 2;
    }

    return 1;
}

export function mapInterviewRuntimeStatus(
    interview: InterviewRuntimeStatusRow
): InterviewStatusSnapshot {
    return {
        id: interview.id,
        currentStep: interview.currentStep,
        status: interview.status,
        startedAt: interview.startedAt?.toISOString() ?? null,
        completedAt: interview.completedAt?.toISOString() ?? null,
        interviewMode: interview.interviewMode,
        transcriptStatus: interview.runtimeTranscriptStatus,
        transcriptError: interview.runtimeTranscriptError ?? "",
        hasCvFeedback: interview.hasCvFeedback,
        hasInterviewFeedback: interview.hasInterviewFeedback,
        hasOverallFeedback: interview.hasOverallFeedback,
        hasCodingEvaluation: interview.hasCodingEvaluation,
        statusVersion: interview.statusVersion,
        lastActivityAt: interview.lastActivityAt.toISOString(),
    };
}

export async function getInterviewRuntimeStatusForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        // Runtime-Felder sind das schnelle Step-Gating-Readmodel. Inhalte
        // bleiben in den Detailtabellen, damit Polling keine schweren Joins lädt.
        select: interviewRuntimeStatusSelect,
    });

    return interview ? mapInterviewRuntimeStatus(interview) : null;
}
