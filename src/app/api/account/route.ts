import { db } from "@/db-backend/prisma/client";
import { createClient } from "@/db-backend/auth/server-client";
import {
    getCurrentAppUser,
    provisionCurrentAppUser,
} from "@/db-backend/auth/current-app-user";
import { requireSupabaseEnv } from "@/db-backend/auth/env";
import { removeAvatarForUser } from "@/db-backend/profile/avatar-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function createStatelessSupabaseClient() {
    const { url, publishableKey } = requireSupabaseEnv();

    return createSupabaseClient(
        url,
        publishableKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

export async function POST() {
    const currentUser = await provisionCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({
        user: currentUser,
    });
}

export async function DELETE(request: Request) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  password?: unknown;
              }
            | null;
        const password =
            body && typeof body.password === "string" ? body.password : "";

        if (!password) {
            return Response.json(
                { error: "Bitte bestaetige dein Passwort." },
                { status: 400 }
            );
        }

        const verifier = createStatelessSupabaseClient();
        const { error: signInError } = await verifier.auth.signInWithPassword({
            email: currentUser.email,
            password,
        });

        if (signInError) {
            return Response.json(
                { error: "Das Passwort ist nicht korrekt." },
                { status: 401 }
            );
        }

        const profile = await getProfileSnapshot(currentUser.id);
        await removeAvatarForUser(profile.avatarPath);

        await db.$transaction(async (tx) => {
            await tx.$executeRaw`
                DELETE FROM auth.sessions
                WHERE user_id = ${currentUser.id}::uuid
            `;

            await tx.user.delete({
                where: {
                    id: currentUser.id,
                },
            });

            await tx.$executeRaw`
                DELETE FROM auth.users
                WHERE id = ${currentUser.id}::uuid
            `;
        });

        const supabase = await createClient();
        await supabase.auth.signOut();

        return Response.json({
            message: "Account geloescht.",
        });
    } catch (error) {
        console.error("[api/account]", error);

        return Response.json(
            {
                error: "Account konnte nicht geloescht werden.",
            },
            { status: 500 }
        );
    }
}
