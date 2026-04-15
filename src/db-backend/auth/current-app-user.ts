import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/db-backend/auth/server-client";
import { db } from "@/db-backend/prisma/client";

type AuthIdentity = {
    email: string;
    id: string;
};

type AppProfile = {
    username: string | null;
};

export type CurrentAppUser = {
    email: string;
    id: string;
    profile: AppProfile | null;
};

function readAuthIdentity(user: User | null): AuthIdentity | null {
    if (!user?.id || !user.email) {
        return null;
    }

    return {
        email: user.email,
        id: user.id,
    };
}

async function ensureAppUser(identity: AuthIdentity) {
    const [, , profile] = await db.$transaction([
        db.user.upsert({
            where: {
                id: identity.id,
            },
            update: {},
            create: {
                id: identity.id,
            },
        }),
        db.userSettings.upsert({
            where: {
                userId: identity.id,
            },
            update: {},
            create: {
                userId: identity.id,
            },
        }),
        db.profile.upsert({
            where: {
                userId: identity.id,
            },
            update: {},
            create: {
                userId: identity.id,
            },
            select: {
                username: true,
            },
        }),
    ]);

    return {
        email: identity.email,
        id: identity.id,
        profile,
    } satisfies CurrentAppUser;
}

export async function getCurrentAppUser() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        return null;
    }

    const identity = readAuthIdentity(data.user);

    if (!identity) {
        return null;
    }

    return ensureAppUser(identity);
}
