import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { getInterviewOverallFeedbackDetailForUser } from "@/db-backend/interviews/read/interview-read-service";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_: Request, context: RouteContext) {
    const timing = createServerTiming("api.interviews.overall");
    const currentUser = await timing.measure("auth.identity", () =>
        getCurrentApiIdentity()
    );

    if (!currentUser) {
        timing.log({ status: 401 });
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await context.params;
    const detail = await timing.measure("db.overall", () =>
        getInterviewOverallFeedbackDetailForUser(currentUser.id, id)
    );

    if (!detail) {
        timing.log({ status: 404 });
        return Response.json({ error: "Interview wurde nicht gefunden." }, { status: 404 });
    }

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(detail).length,
    });

    return Response.json(detail);
}
