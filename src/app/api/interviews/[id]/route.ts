import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import {
    getInterviewDetailLightForUser,
    getInterviewDetailForUser,
    getInterviewRuntimeSnapshotForUser,
    getInterviewShellForUser,
} from "@/db-backend/interviews/read/interview-read-service";
import {
    deleteInterviewForUser,
    updateInterviewModeForUser,
    updateInterviewProgressForUser,
} from "@/db-backend/interviews/write/interview-write-service";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(request: Request, context: RouteContext) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const url = new URL(request.url);
    const view = url.searchParams.get("view");

    if (view === "runtime") {
        const snapshot = await getInterviewRuntimeSnapshotForUser(currentUser.id, id);

        if (!snapshot) {
            return Response.json({ error: "Interview not found" }, { status: 404 });
        }

        return Response.json(snapshot);
    }

    const interview =
        view === "shell"
            ? await getInterviewShellForUser(currentUser.id, id)
            : view === "light"
            ? await getInterviewDetailLightForUser(currentUser.id, id)
            : await getInterviewDetailForUser(currentUser.id, id);

    if (!interview) {
        return Response.json({ error: "Interview not found" }, { status: 404 });
    }

    return Response.json({ interview });
}

export async function PATCH(request: Request, context: RouteContext) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as
        | {
              currentStep?: unknown;
              interviewMode?: unknown;
          }
        | null;

    const interviewMode =
        body && (body.interviewMode === "voice" || body.interviewMode === "face")
            ? body.interviewMode
            : null;

    if (interviewMode) {
        try {
            const result = await updateInterviewModeForUser({
                userId: currentUser.id,
                interviewId: id,
                interviewMode,
            });

            return Response.json(result);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Interview-Modus konnte nicht gespeichert werden.";
            const status = message === "Interview not found" ? 404 : 400;

            return Response.json({ error: message }, { status });
        }
    }

    const currentStep =
        body && typeof body.currentStep === "number" ? body.currentStep : NaN;

    if (!Number.isFinite(currentStep)) {
        return Response.json(
            { error: "currentStep is required" },
            { status: 400 }
        );
    }

    const result = await updateInterviewProgressForUser({
        userId: currentUser.id,
        interviewId: id,
        currentStep,
    });

    return Response.json(result);
}

export async function DELETE(_: Request, context: RouteContext) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await deleteInterviewForUser(currentUser.id, id);

    if (!deleted) {
        return Response.json({ error: "Interview not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
}
