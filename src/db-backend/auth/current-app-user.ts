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

async function readSupabaseIdentity() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        return null;
    }

    return readAuthIdentity(data.user);
}

async function readAppUser(identity: AuthIdentity) {
    const [user, settings, profile] = await db.$transaction([
        db.user.findUnique({
            where: {
                id: identity.id,
            },
            select: {
                id: true,
            },
        }),
        db.userSettings.findUnique({
            where: {
                userId: identity.id,
            },
            select: {
                userId: true,
            },
        }),
        db.profile.findUnique({
            where: {
                userId: identity.id,
            },
            select: {
                username: true,
            },
        }),
    ]);

    return {
        userExists: Boolean(user),
        settingsExist: Boolean(settings),
        profile,
    };
}

async function provisionMissingAppUserRecords(identity: AuthIdentity) {
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

    return profile;
}

async function ensureAppUser(identity: AuthIdentity) {
    const appUser = await readAppUser(identity);

    // Häufige Requests sollen keine unnötigen Schreibzugriffe auslösen.
    if (appUser.userExists && appUser.settingsExist && appUser.profile) {
        return {
            email: identity.email,
            id: identity.id,
            profile: appUser.profile,
        } satisfies CurrentAppUser;
    }

    // Nur wenn Basisdaten fehlen, provisionieren wir die App-Datensätze nach.
    const profile = await provisionMissingAppUserRecords(identity);

    return {
        email: identity.email,
        id: identity.id,
        profile,
    } satisfies CurrentAppUser;
}

export async function getCurrentAppUser() {
    // Identität und App-Daten sind getrennt, damit der Hot Path
    // später einfacher gegen Proxy- oder Cache-Optimierungen austauschbar bleibt.
    const identity = await readSupabaseIdentity();

    if (!identity) {
        return null;
    }

    return ensureAppUser(identity);
}
