import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { notFound, ok, unauthorized } from "@/db-backend/api/responses";
import { getInterviewCodingChallengeDetailForUser } from "@/db-backend/interviews/read/interview-read-service";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_: Request, context: RouteContext) {
    const timing = createServerTiming("api.interviews.coding");
    const currentUser = await timing.measure("auth.identity", () =>
        getCurrentApiIdentity()
    );

    if (!currentUser) {
        timing.log({ status: 401 });
        return unauthorized();
    }

    const { id } = await context.params;
    const codingChallenge = await timing.measure("db.coding", () =>
        getInterviewCodingChallengeDetailForUser(currentUser.id, id)
    );

    if (codingChallenge === null) {
        timing.log({ status: 404 });
        return notFound("Coding-Challenge wurde nicht gefunden.");
    }

    const response = {
        codingChallenge,
    };

    timing.log({
        status: 200,
        payloadBytes: JSON.stringify(response).length,
    });

    return ok(response);
}
