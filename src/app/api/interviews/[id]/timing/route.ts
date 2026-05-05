import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { upsertInterviewTimingMetrics } from "@/db-backend/interviews/analysis/interview-analysis-service";
import type { InterviewTimingMetrics } from "@/lib/voice-interview/core/types";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

function readTimingMetrics(body: {
    answerCount?: unknown;
    totalCandidateSpeechMs?: unknown;
    averageAnswerDurationMs?: unknown;
    longestAnswerDurationMs?: unknown;
    shortestAnswerDurationMs?: unknown;
    averageResponseLatencyMs?: unknown;
    longestResponseLatencyMs?: unknown;
    candidateWordsPerMinute?: unknown;
} | null): InterviewTimingMetrics {
    return {
        answerCount:
            body && typeof body.answerCount === "number" ? body.answerCount : 0,
        totalCandidateSpeechMs:
            body && typeof body.totalCandidateSpeechMs === "number"
                ? body.totalCandidateSpeechMs
                : 0,
        averageAnswerDurationMs:
            body && typeof body.averageAnswerDurationMs === "number"
                ? body.averageAnswerDurationMs
                : 0,
        longestAnswerDurationMs:
            body && typeof body.longestAnswerDurationMs === "number"
                ? body.longestAnswerDurationMs
                : 0,
        shortestAnswerDurationMs:
            body && typeof body.shortestAnswerDurationMs === "number"
                ? body.shortestAnswerDurationMs
                : 0,
        averageResponseLatencyMs:
            body && typeof body.averageResponseLatencyMs === "number"
                ? body.averageResponseLatencyMs
                : 0,
        longestResponseLatencyMs:
            body && typeof body.longestResponseLatencyMs === "number"
                ? body.longestResponseLatencyMs
                : 0,
        candidateWordsPerMinute:
            body && typeof body.candidateWordsPerMinute === "number"
                ? body.candidateWordsPerMinute
                : null,
    };
}

export async function PUT(request: Request, context: RouteContext) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as
        | {
              answerCount?: unknown;
              totalCandidateSpeechMs?: unknown;
              averageAnswerDurationMs?: unknown;
              longestAnswerDurationMs?: unknown;
              shortestAnswerDurationMs?: unknown;
              averageResponseLatencyMs?: unknown;
              longestResponseLatencyMs?: unknown;
              candidateWordsPerMinute?: unknown;
          }
        | null;

    const metrics = readTimingMetrics(body);
    await upsertInterviewTimingMetrics({
        userId: currentUser.id,
        interviewId: id,
        metrics,
    });

    return Response.json({ ok: true });
}
