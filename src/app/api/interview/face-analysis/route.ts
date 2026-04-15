/**
 * Voice interview face-analysis endpoint.
 *
 * This route is called after a voice session ends. It accepts either the raw
 * face-landmark export or already structured snapshots and returns the final
 * body-language report used by the interview feedback flow.
 */

import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { saveInterviewFaceAnalysisForUser } from "@/db-backend/interviews/interview-service";
import {
    analyzeFaceLandmarkSession,
    parseFaceLandmarkSnapshots,
    parseFaceLandmarkTxt,
} from "@/lib/face-analysis";

export const runtime = "nodejs";

async function readRequestPayload(req: Request) {
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const file = formData.get("file");
        const content =
            typeof formData.get("content") === "string"
                ? String(formData.get("content"))
                : "";
        const role =
            typeof formData.get("role") === "string"
                ? String(formData.get("role")).trim()
                : "";
        const interviewId =
            typeof formData.get("interviewId") === "string"
                ? String(formData.get("interviewId")).trim()
                : "";
        const snapshotsField =
            typeof formData.get("snapshots") === "string"
                ? String(formData.get("snapshots"))
                : "";

        if (file instanceof File && file.size > 0) {
            return {
                interviewId,
                role,
                snapshots: parseFaceLandmarkTxt(await file.text()),
            };
        }

        if (snapshotsField.trim()) {
            return {
                interviewId,
                role,
                snapshots: parseFaceLandmarkTxt(snapshotsField),
            };
        }

        return {
            interviewId,
            role,
            snapshots: parseFaceLandmarkTxt(content),
        };
    }

    const rawBody = await req.text();
    if (!rawBody.trim()) {
        throw new Error("Request Body ist leer.");
    }

    if (contentType.includes("application/json")) {
        const parsed = JSON.parse(rawBody) as {
            interviewId?: unknown;
            role?: unknown;
            content?: unknown;
            snapshots?: unknown;
        };
        const role = typeof parsed.role === "string" ? parsed.role.trim() : "";
        const interviewId =
            typeof parsed.interviewId === "string"
                ? parsed.interviewId.trim()
                : "";

        if (Array.isArray(parsed.snapshots)) {
            return {
                interviewId,
                role,
                snapshots: parseFaceLandmarkSnapshots(parsed.snapshots),
            };
        }

        if (typeof parsed.content === "string") {
            return {
                interviewId,
                role,
                snapshots: parseFaceLandmarkTxt(parsed.content),
            };
        }
    }

    return {
        interviewId: "",
        role: "",
        snapshots: parseFaceLandmarkTxt(rawBody),
    };
}

export async function POST(req: Request) {
    try {
        const { interviewId, role, snapshots } = await readRequestPayload(req);
        const report = analyzeFaceLandmarkSession({
            role,
            snapshots,
        });

        if (interviewId) {
            const currentUser = await getCurrentAppUser();

            if (currentUser) {
                await saveInterviewFaceAnalysisForUser({
                    userId: currentUser.id,
                    interviewId,
                    report,
                });
            }
        }

        return Response.json(report);
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Face-Analyse konnte nicht erstellt werden.";
        return Response.json({ error: message }, { status: 400 });
    }
}
