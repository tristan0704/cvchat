import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { createOrRefreshInterviewOverallFeedback } from "@/db-backend/interviews/overall-feedback-service";
import { getInterviewRuntimeStatusForUser } from "@/db-backend/interviews/runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  interviewId?: unknown;
                  force?: unknown;
              }
            | null;

        const interviewId =
            typeof body?.interviewId === "string" ? body.interviewId.trim() : "";
        const force = body?.force === true;

        if (!interviewId) {
            return Response.json(
                { error: "Interview id is required" },
                { status: 400 }
            );
        }

        const overallFeedback = await createOrRefreshInterviewOverallFeedback({
            userId: currentUser.id,
            interviewId,
            force,
        });
        const status = await getInterviewRuntimeStatusForUser(
            currentUser.id,
            interviewId
        );

        return Response.json({
            overallFeedback: {
                analyzedAt: overallFeedback.analyzedAt.toISOString(),
                overallScore: overallFeedback.overallScore,
                summary: overallFeedback.summary,
                strengths: overallFeedback.strengths,
                issues: overallFeedback.issues,
                improvements: overallFeedback.improvements,
                cvScore: overallFeedback.cvScore,
                interviewScore: overallFeedback.interviewScore,
                codingChallengeScore: overallFeedback.codingChallengeScore,
            },
            status,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to build overall feedback";
        const status =
            message === "Interview not found"
                ? 404
                : message === "Interview is not ready for overall feedback"
                  ? 409
                  : 500;

        return Response.json({ error: message }, { status });
    }
}
