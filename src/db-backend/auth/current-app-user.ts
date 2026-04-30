import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/db-backend/auth/server-client";
import { db } from "@/db-backend/prisma/client";

// Dateiübersicht:
// Dieser Auth-Helfer trennt Identitätsprüfung strikt von Provisioning. Normale
// Reads dürfen keine App-Datensätze anlegen; sie sollen nur den aktuellen
// Zustand lesen. Explizite Bootstrap-/Auth-Einstiegspunkte übernehmen das
// Anlegen fehlender User-, Profil- und Settings-Datensätze.

export type AuthIdentity = {
    email: string;
    id: string;
};

type AppProfile = {
    username: string | null;
};

export type AppUserReadState =
    | {
          status: "unauthenticated";
          identity: null;
          user: null;
      }
    | {
          status: "missing_app_records";
          identity: AuthIdentity;
          user: null;
      }
    | {
          status: "ready";
          identity: AuthIdentity;
          user: CurrentAppUser;
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

const readSupabaseIdentityCached = cache(readSupabaseIdentity);

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

function mapReadyAppUser(identity: AuthIdentity, profile: AppProfile) {
    return {
        email: identity.email,
        id: identity.id,
        profile,
    } satisfies CurrentAppUser;
}

export async function ensureAppUserProvisioned(identity: AuthIdentity) {
    const profile = await provisionMissingAppUserRecords(identity);

    return mapReadyAppUser(identity, profile);
}

export async function provisionCurrentAppUser() {
    const identity = await readSupabaseIdentity();

    if (!identity) {
        return null;
    }

    return ensureAppUserProvisioned(identity);
}

export async function getCurrentAppUserState(): Promise<AppUserReadState> {
    const identity = await readSupabaseIdentityCached();

    if (!identity) {
        return {
            status: "unauthenticated",
            identity: null,
            user: null,
        };
    }

    return getCurrentAppUserStateForIdentityCached(identity);
}

export async function getCurrentAppUser() {
    // Normale Reads dürfen keine App-Datensätze anlegen. Provisioning läuft nur
    // über Auth-Einstiegspunkte oder den expliziten Bootstrap-Fallback.
    const identity = await readSupabaseIdentityCached();

    if (!identity) {
        return null;
    }

    const state = await getCurrentAppUserStateForIdentityCached(identity);
    return state.status === "ready" ? state.user : null;
}

async function getCurrentAppUserStateForIdentity(
    identity: AuthIdentity
): Promise<AppUserReadState> {
    const appUser = await readAppUser(identity);

    if (appUser.userExists && appUser.settingsExist && appUser.profile) {
        return {
            status: "ready",
            identity,
            user: mapReadyAppUser(identity, appUser.profile),
        };
    }

    return {
        status: "missing_app_records",
        identity,
        user: null,
    };
}

const getCurrentAppUserStateForIdentityCached = cache(
    getCurrentAppUserStateForIdentity
);
