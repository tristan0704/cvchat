function readFirstDefined(...keys: string[]) {
    for (const key of keys) {
        const value = process.env[key]?.trim();

        if (value) {
            return value;
        }
    }

    return null;
}

export function getSupabaseUrl() {
    return readFirstDefined(
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPBASE_SUPABASE_URL",
        "SUPBASE_SUPABASE_SUPABASE_URL",
    );
}

export function getSupabasePublishableKey() {
    return readFirstDefined(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPBASE_SUPABASE_PUBLISHABLE_KEY",
        "SUPBASE_SUPABASE_SUPABASE_PUBLISHABLE_KEY",
        "SUPBASE_SUPABASE_ANON_KEY",
        "SUPBASE_SUPABASE_SUPABASE_ANON_KEY",
    );
}

export function getDatabaseUrl() {
    return readFirstDefined(
        "DATABASE_URL",
        "SUPBASE_POSTGRES_PRISMA_URL",
        "SUPBASE_POSTGRES_URL",
    );
}

export function getDirectUrl() {
    return readFirstDefined(
        "DIRECT_URL",
        "SUPBASE_POSTGRES_URL_NON_POOLING",
        "SUPBASE_POSTGRES_URL",
    );
}

export function applyEnvAliases() {
    const supabaseUrl = getSupabaseUrl();
    const supabasePublishableKey = getSupabasePublishableKey();
    const databaseUrl = getDatabaseUrl();
    const directUrl = getDirectUrl();

    if (supabaseUrl && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    }

    if (supabasePublishableKey && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
    }

    if (databaseUrl && !process.env.DATABASE_URL) {
        process.env.DATABASE_URL = databaseUrl;
    }

    if (directUrl && !process.env.DIRECT_URL) {
        process.env.DIRECT_URL = directUrl;
    }
}
