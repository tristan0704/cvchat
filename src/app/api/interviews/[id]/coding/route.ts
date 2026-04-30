import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getInterviewCodingChallengeDetailForUser } from "@/db-backend/interviews/interview-service";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_: Request, context: RouteContext) {
    const timing = createServerTiming("api.interviews.coding");
    const currentUser = await timing.measure("auth", () => getCurrentAppUser());

    if (!currentUser) {
        timing.log({ status: 401 });
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const codingChallenge = await timing.measure("db.coding", () =>
        getInterviewCodingChallengeDetailForUser(currentUser.id, id)
    );

    if (codingChallenge === null) {
        timing.log({ status: 404 });
        return Response.json({ error: "Coding challenge not found" }, { status: 404 });
    }

    const response = {
        codingChallenge,
    };

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(response).length,
    });

    return Response.json(response);
}
