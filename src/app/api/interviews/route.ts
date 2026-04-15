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
              role?: unknown;
              experience?: unknown;
              companySize?: unknown;
              interviewType?: unknown;
          }
        | null;

    const config = readConfig(body);

    if (!config.role) {
        return Response.json({ error: "Role is required" }, { status: 400 });
    }

    const interview = await createInterviewForUser(currentUser.id, config);
    return Response.json({ interview });
}
