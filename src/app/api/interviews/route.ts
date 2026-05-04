import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { listInterviewsForUser } from "@/db-backend/interviews/read/interview-read-service";
import { createInterviewForUser } from "@/db-backend/interviews/write/interview-write-service";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";

export async function GET() {
    const timing = createServerTiming("api.interviews.list");
    const currentUser = await timing.measure("auth.identity", () =>
        getCurrentApiIdentity()
    );

    if (!currentUser) {
        timing.log({ status: 401 });
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interviews = await timing.measure("db.list", () =>
        listInterviewsForUser(currentUser.id)
    );
    const response = { interviews };

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(response).length,
    });

    return Response.json(response);
}

export async function POST(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
              templateId?: unknown;
          }
        | null;

    const templateId =
        body && typeof body.templateId === "string" ? body.templateId.trim() : "";

    if (!templateId) {
        return Response.json({ error: "templateId is required" }, { status: 400 });
    }

    try {
        const interview = await createInterviewForUser({
            userId: currentUser.id,
            templateId,
        });
        return Response.json({ interview });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Interview konnte nicht erstellt werden.";
        const status = message === "Interview template not found" ? 404 : 400;

        return Response.json({ error: message }, { status });
    }
}
