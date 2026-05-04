import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { notFound, ok, unauthorized } from "@/db-backend/api/responses";
import { getInterviewRuntimeStatusForUser } from "@/db-backend/interviews/runtime";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

// Dateiübersicht:
// Dieser Endpunkt ist der günstige Polling-Pfad für die Interviewseite. Er
// liefert nur Step-Gating und Statusflags, keine geplanten Fragen und keine
// schweren Auswertungsdaten.
export async function GET(_: Request, context: RouteContext) {
    const timing = createServerTiming("api.interviews.status");
    const currentUser = await timing.measure("auth.identity", () =>
        getCurrentApiIdentity()
    );

    if (!currentUser) {
        timing.log({ status: 401 });
        return unauthorized();
    }

    const { id } = await context.params;
    const status = await timing.measure("db.runtime", () =>
        getInterviewRuntimeStatusForUser(currentUser.id, id)
    );

    if (!status) {
        timing.log({ status: 404 });
        return notFound("Interview not found");
    }

    const response = { status };

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(response).length,
    });

    return ok(response);
}
