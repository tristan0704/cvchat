import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { uploadAvatarForUser } from "@/db-backend/profile/avatar-service";

export const runtime = "nodejs";

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
                { error: "Bilddatei ist erforderlich." },
                { status: 400 }
            );
        }

        const avatar = await uploadAvatarForUser(currentUser.id, file);

        return Response.json({
            message: "Profilbild gespeichert.",
            avatarUrl: avatar.avatarUrl,
        });
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Profilbild konnte nicht gespeichert werden.",
            },
            { status: 400 }
        );
    }
}
