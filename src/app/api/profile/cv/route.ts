import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import {
    getActiveCvSummaryForUser,
    uploadCvForUser,
} from "@/db-backend/cv/cv-service";
import { CvFeedbackError } from "@/lib/cv/server/analyze-cv-feedback";

export const runtime = "nodejs";

export async function GET() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cv = await getActiveCvSummaryForUser(currentUser.id);
    return Response.json({ cv });
}

export async function POST(request: Request) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return Response.json(
                { error: "PDF file is required" },
                { status: 400 }
            );
        }

        const cv = await uploadCvForUser(currentUser.id, file);

        return Response.json({
            message: "Lebenslauf gespeichert.",
            cv,
        });
    } catch (error) {
        if (error instanceof CvFeedbackError) {
            return Response.json({ error: error.message }, { status: error.status });
        }

        console.error("[api/profile/cv]", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
