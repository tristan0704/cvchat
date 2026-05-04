import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { listInterviewTemplateCatalog } from "@/db-backend/interviews/interview-template-service";

export const runtime = "nodejs";

export async function GET() {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const catalog = await listInterviewTemplateCatalog();
    return Response.json({ catalog });
}
