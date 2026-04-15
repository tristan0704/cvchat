import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import {
    deleteInterviewForUser,
    getInterviewDetailForUser,
    updateInterviewProgressForUser,
} from "@/db-backend/interviews/interview-service";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_: Request, context: RouteContext) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const interview = await getInterviewDetailForUser(currentUser.id, id);

    if (!interview) {
        return Response.json({ error: "Interview not found" }, { status: 404 });
    }

    return Response.json({ interview });
}

export async function PATCH(request: Request, context: RouteContext) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as
        | {
              currentStep?: unknown;
          }
        | null;

    const currentStep =
        body && typeof body.currentStep === "number" ? body.currentStep : NaN;

    if (!Number.isFinite(currentStep)) {
        return Response.json(
            { error: "currentStep is required" },
            { status: 400 }
        );
    }

    const interview = await updateInterviewProgressForUser({
        userId: currentUser.id,
        interviewId: id,
        currentStep,
    });

    return Response.json({ interview });
}

export async function DELETE(_: Request, context: RouteContext) {
    const currentUser = await getCurrentAppUser();

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
