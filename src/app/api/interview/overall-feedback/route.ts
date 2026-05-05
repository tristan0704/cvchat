import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { createOrRefreshInterviewOverallFeedback } from "@/db-backend/interviews/overall-feedback-service";
import { getInterviewRuntimeStatusForUser } from "@/db-backend/interviews/runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
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
                { error: "Interview-ID ist erforderlich." },
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
                : "Gesamtfeedback konnte nicht erstellt werden.";
        const status =
            message === "Interview not found"
                ? 404
                : message === "Interview is not ready for overall feedback"
                  ? 409
                  : 500;
        const userMessage =
            message === "Interview not found"
                ? "Interview wurde nicht gefunden."
                : message === "Interview is not ready for overall feedback"
                  ? "Interview ist noch nicht bereit für das Gesamtfeedback."
                  : message;

        return Response.json({ error: userMessage }, { status });
    }
}
