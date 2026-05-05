import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import {
    assignCodingChallengeAttempt,
    evaluateCodingChallengeAttempt,
    updateCodingChallengeDraft,
} from "@/db-backend/coding-challenge/coding-challenge-service";
import { getInterviewRuntimeStatusForUser } from "@/db-backend/interviews/runtime";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";
import { normalizeLanguage } from "@/lib/i18n/dictionaries";
import type {
    CodingChallengeEvaluationRequest,
} from "@/lib/coding-challenge/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get("interviewId") ?? "";
    const role = searchParams.get("role") ?? "";
    const excludeTaskId = searchParams.get("excludeTaskId") ?? undefined;

    if (!interviewId) {
        return Response.json(
            { error: "Interview-ID ist erforderlich." },
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
                : "Coding-Challenge konnte nicht geladen werden.";
        const status =
            message === "Interview not found"
                ? 404
                : message === "Interview feedback must be completed first"
                  ? 409
                  : 500;
        const userMessage =
            message === "Interview not found"
                ? "Interview wurde nicht gefunden."
                : message === "Interview feedback must be completed first"
                  ? "Interview-Feedback muss zuerst abgeschlossen werden."
                  : message;

        return Response.json(
            { error: userMessage },
            { status }
        );
    }
}

export async function PATCH(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
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
                { error: "Interview-ID und Versuch-ID sind erforderlich." },
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
            { error: "Coding-Challenge-Entwurf konnte nicht gespeichert werden." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
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
                { error: "Interview-ID und Versuch-ID sind erforderlich." },
                { status: 400 }
            );
        }

        if (!code.trim()) {
            return Response.json(
                { error: "Code-Einreichung ist erforderlich." },
                { status: 400 }
            );
        }

        const profile = await getProfileSnapshot(currentUser.id);
        const result = await evaluateCodingChallengeAttempt({
            userId: currentUser.id,
            interviewId,
            attemptId,
            code,
            language: normalizeLanguage(profile.language),
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
            { error: "Coding-Challenge konnte nicht bewertet werden." },
            { status: 500 }
        );
    }
}
