import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import {
    getCvFeedbackAnalysisForInterview,
    getOrCreateCvFeedbackAnalysisForInterview,
} from "@/db-backend/cv/cv-service";
import { getInterviewRuntimeStatusForUser } from "@/db-backend/interviews/runtime";
import { CvFeedbackError } from "@/lib/cv/server/analyze-cv-feedback";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const interviewId = url.searchParams.get("interviewId")?.trim() ?? "";

        if (!interviewId) {
            return Response.json(
                { error: "Interview id is required" },
                { status: 400 }
            );
        }

        const data = await getCvFeedbackAnalysisForInterview({
            userId: currentUser.id,
            interviewId,
        });

        return Response.json(data);
    } catch (error) {
        if (error instanceof CvFeedbackError) {
            return Response.json({ error: error.message }, { status: error.status });
        }

        console.error("[api/interview/cv-feedback]", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await req.json().catch(() => null)) as
            | {
                  interviewId?: unknown;
                  force?: unknown;
              }
            | null;
        const interviewId =
            body && typeof body.interviewId === "string"
                ? body.interviewId.trim()
                : "";
        const force = body && typeof body.force === "boolean" ? body.force : false;

        if (!interviewId) {
            return Response.json(
                { error: "Interview id is required" },
                { status: 400 }
            );
        }

        const data = await getOrCreateCvFeedbackAnalysisForInterview({
            userId: currentUser.id,
            interviewId,
            force,
        });
        const status = await getInterviewRuntimeStatusForUser(
            currentUser.id,
            interviewId
        );

        return Response.json({ ...data, status });
    } catch (error) {
        if (error instanceof CvFeedbackError) {
            return Response.json({ error: error.message }, { status: error.status });
        }

        console.error("[api/interview/cv-feedback]", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
