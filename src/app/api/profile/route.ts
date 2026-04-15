import { createClient } from "@/db-backend/auth/server-client";
import { createAvatarUrlForPath } from "@/db-backend/profile/avatar-service";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import {
    getProfileSnapshot,
    isUniqueConstraintError,
    updateProfileUsernameForUser,
} from "@/db-backend/profile/profile-service";

export const runtime = "nodejs";

async function buildProfileResponse(args: {
    email: string;
    userId: string;
}) {
    const profile = await getProfileSnapshot(args.userId);

    return {
        email: args.email,
        username: profile.username,
        avatarUrl: await createAvatarUrlForPath(profile.avatarPath),
        language: profile.language,
        emailNotifications: profile.emailNotifications,
        activeCv: profile.activeCv,
    };
}

export async function GET() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await buildProfileResponse({
        email: currentUser.email,
        userId: currentUser.id,
    });
    return Response.json(profile);
}

export async function PATCH(request: Request) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
              username?: unknown;
              email?: unknown;
              password?: unknown;
              confirmPassword?: unknown;
          }
        | null;

    const username =
        body && typeof body.username === "string" ? body.username.trim() : "";
    const email =
        body && typeof body.email === "string" ? body.email.trim() : "";
    const password =
        body && typeof body.password === "string" ? body.password : "";
    const confirmPassword =
        body && typeof body.confirmPassword === "string"
            ? body.confirmPassword
            : "";

    if (password && password !== confirmPassword) {
        return Response.json(
            { error: "Die Passwoerter stimmen nicht ueberein." },
            { status: 400 }
        );
    }

    try {
        await updateProfileUsernameForUser(currentUser.id, {
            username,
        });
    } catch (error) {
        if (isUniqueConstraintError(error, "username")) {
            return Response.json(
                { error: "Der Benutzername ist bereits vergeben." },
                { status: 409 }
            );
        }

        throw error;
    }

    let message = "Profil gespeichert.";
    let responseEmail = currentUser.email;

    if (email && email !== currentUser.email) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.updateUser({
            email,
            ...(password ? { password } : {}),
        });

        if (error) {
            return Response.json({ error: error.message }, { status: 400 });
        }

        responseEmail = data.user?.email ?? email;

        message =
            "Profil gespeichert. Falls die E-Mail geaendert wurde, bitte die Bestaetigung pruefen.";
    } else if (password) {
        const supabase = await createClient();
        const { error } = await supabase.auth.updateUser({
            password,
        });

        if (error) {
            return Response.json({ error: error.message }, { status: 400 });
        }

        message = "Profil und Passwort gespeichert.";
    }

    const profile = await buildProfileResponse({
        email: responseEmail,
        userId: currentUser.id,
    });
    return Response.json({
        message,
        profile,
    });
}
