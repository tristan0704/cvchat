import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getHomeDashboardSnapshot } from "@/db-backend/interviews/interview-service";

export const runtime = "nodejs";

export async function GET() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getHomeDashboardSnapshot(currentUser.id);
    return Response.json(summary);
}
