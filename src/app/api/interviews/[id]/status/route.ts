import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getInterviewStatusForUser } from "@/db-backend/interviews/interview-service";
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
    const currentUser = await timing.measure("auth", () => getCurrentAppUser());

    if (!currentUser) {
        timing.log({ status: 401 });
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const status = await timing.measure("db.status", () =>
        getInterviewStatusForUser(currentUser.id, id)
    );

    if (!status) {
        timing.log({ status: 404 });
        return Response.json({ error: "Interview not found" }, { status: 404 });
    }

    const response = { status };

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(response).length,
    });

    return Response.json(response);
}
