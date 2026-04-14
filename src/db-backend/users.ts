import "server-only";

import { db } from "@/db-backend/client";
import { createClient } from "@/lib/supabase/server";

type AuthIdentity = {
    email: string;
    id: string;
};

function readAuthIdentity(claims: unknown): AuthIdentity | null {
    if (!claims || typeof claims !== "object") {
        return null;
    }

    const { email, sub } = claims as {
        email?: unknown;
        sub?: unknown;
    };

    if (typeof sub !== "string" || typeof email !== "string") {
        return null;
    }

    return {
        email,
        id: sub,
    };
}

async function ensureAppUser(identity: AuthIdentity) {
    await db.user.upsert({
        where: {
            id: identity.id,
        },
        update: {
            email: identity.email,
        },
        create: {
            email: identity.email,
            id: identity.id,
        },
    });

    await db.profile.upsert({
        where: {
            userId: identity.id,
        },
        update: {},
        create: {
            userId: identity.id,
        },
    });

    return db.user.findUnique({
        where: {
            id: identity.id,
        },
        include: {
            profile: true,
        },
    });
}

export async function getCurrentAppUser() {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const identity = readAuthIdentity(claimsData?.claims ?? null);

    if (!identity) {
        return null;
    }

    return ensureAppUser(identity);
}
