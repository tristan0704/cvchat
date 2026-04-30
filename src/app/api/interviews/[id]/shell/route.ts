import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getInterviewShellForUser } from "@/db-backend/interviews/interview-service";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_: Request, context: RouteContext) {
    const timing = createServerTiming("api.interviews.shell");
    const currentUser = await timing.measure("auth", () => getCurrentAppUser());

    if (!currentUser) {
        timing.log({
            status: 401,
        });
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const interview = await timing.measure("db.shell", () =>
        getInterviewShellForUser(currentUser.id, id)
    );

    if (!interview) {
        timing.log({
            status: 404,
        });
        return Response.json({ error: "Interview not found" }, { status: 404 });
    }

    const response = {
        interview,
    };

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(response).length,
    });

    return Response.json(response);
}
