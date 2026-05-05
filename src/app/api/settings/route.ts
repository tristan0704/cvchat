import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import {
    getProfileSnapshot,
    updateUserSettingsForUser,
} from "@/db-backend/profile/profile-service";

export const runtime = "nodejs";

export async function GET() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const profile = await getProfileSnapshot(currentUser.id);

    return Response.json({
        language: profile.language,
        emailNotifications: profile.emailNotifications,
    });
}

export async function PATCH(request: Request) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
              language?: unknown;
              emailNotifications?: unknown;
          }
        | null;

    const language =
        body && typeof body.language === "string" ? body.language.trim() : "de";
    const emailNotifications =
        body && typeof body.emailNotifications === "boolean"
            ? body.emailNotifications
            : true;

    await updateUserSettingsForUser(currentUser.id, {
        language,
        emailNotifications,
    });

    return Response.json({
        message: "Einstellungen gespeichert.",
        settings: {
            language,
            emailNotifications,
        },
    });
}
