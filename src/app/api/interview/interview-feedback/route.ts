import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import {
    getInterviewFeedbackDetailForUser,
    saveInterviewFeedbackForUser,
} from "@/db-backend/interviews/interview-service";
import { evaluateInterviewFeedback } from "@/app/api/interview/interview-feedback/evaluate-interview-feedback";
import type {
    InterviewFeedbackRequest,
    InterviewFeedbackResponse,
} from "@/lib/interview-feedback-fetch/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const currentUser = await getCurrentAppUser();

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
            return Response.json({
                evaluation: existing.feedback,
            } satisfies InterviewFeedbackResponse);
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

        return Response.json({
            evaluation,
        } satisfies InterviewFeedbackResponse);
    } catch (error) {
        console.error("[api/interview/interview-feedback-fetch-fetch]", error);

        return Response.json(
            { error: "Interview-Feedback konnte nicht analysiert werden." },
            { status: 500 }
        );
    }
}
