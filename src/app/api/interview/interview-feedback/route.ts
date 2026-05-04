import { getCurrentApiIdentity } from "@/db-backend/auth/api-identity";
import { getInterviewFeedbackDetailForUser } from "@/db-backend/interviews/read/interview-read-service";
import { getInterviewRuntimeStatusForUser } from "@/db-backend/interviews/runtime";
import { saveInterviewFeedbackForUser } from "@/db-backend/interviews/analysis/interview-analysis-service";
import { evaluateInterviewFeedback } from "@/app/api/interview/interview-feedback/evaluate-interview-feedback";
import type { InterviewFeedbackRequest } from "@/lib/interview-feedback-fetch/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const currentUser = await getCurrentApiIdentity();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | (InterviewFeedbackRequest & {
                  interviewId?: unknown;
              })
            | null;

        const interviewId =
            body && typeof body.interviewId === "string"
                ? body.interviewId.trim()
                : "";
        const role = body && typeof body.role === "string" ? body.role.trim() : "";
        const transcript =
            body && typeof body.transcript === "string" ? body.transcript.trim() : "";
        const transcriptFingerprint =
            body && typeof body.transcriptFingerprint === "string"
                ? body.transcriptFingerprint.trim()
                : "";

        if (!interviewId) {
            return Response.json(
                { error: "Interview id is required" },
                { status: 400 }
            );
        }

        if (!role) {
            return Response.json({ error: "Role is required" }, { status: 400 });
        }

        if (!transcript) {
            return Response.json(
                { error: "Transcript export is required" },
                { status: 400 }
            );
        }

        if (!transcriptFingerprint) {
            return Response.json(
                { error: "Transcript fingerprint is required" },
                { status: 400 }
            );
        }

        const existing = await getInterviewFeedbackDetailForUser(
            currentUser.id,
            interviewId
        );

        if (
            existing?.feedback &&
            existing.feedback.transcriptFingerprint === transcriptFingerprint
        ) {
            const status = await getInterviewRuntimeStatusForUser(
                currentUser.id,
                interviewId
            );
            return Response.json({
                evaluation: existing.feedback,
                status,
            });
        }

        const evaluation = await evaluateInterviewFeedback({
            role,
            experience:
                body && typeof body.experience === "string"
                    ? body.experience.trim()
                    : "",
            companySize:
                body && typeof body.companySize === "string"
                    ? body.companySize.trim()
                    : "",
            transcript,
            transcriptFingerprint,
        });

        await saveInterviewFeedbackForUser({
            userId: currentUser.id,
            interviewId,
            evaluation,
        });
        const status = await getInterviewRuntimeStatusForUser(
            currentUser.id,
            interviewId
        );

        return Response.json({
            evaluation,
            status,
        });
    } catch (error) {
        console.error("[api/interview/interview-feedback-fetch]", error);

        return Response.json(
            { error: "Interview-Feedback konnte nicht analysiert werden." },
            { status: 500 }
        );
    }
}
