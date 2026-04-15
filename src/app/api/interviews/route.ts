import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import {
    createInterviewForUser,
    listInterviewsForUser,
} from "@/db-backend/interviews/interview-service";
import type { InterviewCvConfig } from "@/lib/cv/types";

export const runtime = "nodejs";

function readConfig(body: {
    role?: unknown;
    experience?: unknown;
    companySize?: unknown;
    interviewType?: unknown;
} | null): InterviewCvConfig {
    return {
        role: body && typeof body.role === "string" ? body.role.trim() : "",
        experience:
            body && typeof body.experience === "string"
                ? body.experience.trim()
                : "",
        companySize:
            body && typeof body.companySize === "string"
                ? body.companySize.trim()
                : "",
        interviewType:
            body && typeof body.interviewType === "string"
                ? body.interviewType.trim()
                : "",
    };
}

export async function GET() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interviews = await listInterviewsForUser(currentUser.id);
    return Response.json({ interviews });
}

export async function POST(request: Request) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
              templateId?: unknown;
              role?: unknown;
              experience?: unknown;
              companySize?: unknown;
              interviewType?: unknown;
          }
        | null;

    const config = readConfig(body);
    const templateId =
        body && typeof body.templateId === "string" ? body.templateId.trim() : "";

    if (!templateId && !config.role) {
        return Response.json(
            { error: "templateId or role is required" },
            { status: 400 }
        );
    }

    try {
        const interview = await createInterviewForUser({
            userId: currentUser.id,
            templateId: templateId || undefined,
            config,
        });
        return Response.json({ interview });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Interview konnte nicht erstellt werden.";
        const status = message === "Interview template not found" ? 404 : 400;

        return Response.json({ error: message }, { status });
    }
}
