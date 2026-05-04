import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import {
    assignCodingChallengeAttempt,
    evaluateCodingChallengeAttempt,
    updateCodingChallengeDraft,
} from "@/db-backend/coding-challenge/coding-challenge-service";
import { getInterviewRuntimeStatusForUser } from "@/db-backend/interviews/runtime";
import type {
    CodingChallengeEvaluationRequest,
} from "@/lib/coding-challenge/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get("interviewId") ?? "";
    const role = searchParams.get("role") ?? "";
    const excludeTaskId = searchParams.get("excludeTaskId") ?? undefined;

    if (!interviewId) {
        return Response.json(
            { error: "Interview id is required" },
            { status: 400 }
        );
    }

    try {
        const draft = await assignCodingChallengeAttempt({
            userId: currentUser.id,
            interviewId,
            role,
            excludeTaskId,
        });
        const status = await getInterviewRuntimeStatusForUser(
            currentUser.id,
            interviewId
        );

        return Response.json({ draft, status });
    } catch (error) {
        console.error("[api/interview/coding-challenge]", error);
        const message =
            error instanceof Error
                ? error.message
                : "Unable to load coding challenge";
        const status =
            message === "Interview not found"
                ? 404
                : message === "Interview feedback must be completed first"
                  ? 409
                  : 500;

        return Response.json(
            { error: message },
            { status }
        );
    }
}

export async function PATCH(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  interviewId?: unknown;
                  attemptId?: unknown;
                  code?: unknown;
              }
            | null;

        const interviewId =
            body && typeof body.interviewId === "string"
                ? body.interviewId.trim()
                : "";
        const attemptId =
            body && typeof body.attemptId === "string"
                ? body.attemptId.trim()
                : "";
        const code = body && typeof body.code === "string" ? body.code : "";

        if (!interviewId || !attemptId) {
            return Response.json(
                { error: "Interview id and attempt id are required" },
                { status: 400 }
            );
        }

        const draft = await updateCodingChallengeDraft({
            userId: currentUser.id,
            interviewId,
            attemptId,
            code,
        });

        return Response.json({ draft });
    } catch (error) {
        console.error("[api/interview/coding-challenge]", error);
        return Response.json(
            { error: "Unable to save coding challenge draft" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | (CodingChallengeEvaluationRequest & {
                  interviewId?: unknown;
              })
            | null;

        const interviewId =
            body && typeof body.interviewId === "string"
                ? body.interviewId.trim()
                : "";
        const attemptId =
            body && typeof body.attemptId === "string"
                ? body.attemptId.trim()
                : "";
        const code = body && typeof body.code === "string" ? body.code : "";

        if (!interviewId || !attemptId) {
            return Response.json(
                { error: "Interview id and attempt id are required" },
                { status: 400 }
            );
        }

        if (!code.trim()) {
            return Response.json(
                { error: "Code submission is required" },
                { status: 400 }
            );
        }

        const result = await evaluateCodingChallengeAttempt({
            userId: currentUser.id,
            interviewId,
            attemptId,
            code,
        });
        const status = await getInterviewRuntimeStatusForUser(
            currentUser.id,
            interviewId
        );

        return Response.json({
            draft: result.draft,
            evaluation: result.evaluation,
            status,
        });
    } catch (error) {
        console.error("[api/interview/coding-challenge]", error);
        return Response.json(
            { error: "Unable to evaluate coding challenge" },
            { status: 500 }
        );
    }
}
