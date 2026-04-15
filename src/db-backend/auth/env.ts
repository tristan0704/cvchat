function readEnvValue(...keys: string[]) {
    for (const key of keys) {
        const value = process.env[key]?.trim();

        if (value) {
            return value;
        }
    }

    return null;
}

export function getSupabaseUrl() {
    return readEnvValue(
        "NEXT_PUBLIC_SUPABASE_URL",
        "STORAGE_SUPABASE_URL",
    );
}

export function getSupabasePublishableKey() {
    return readEnvValue(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "STORAGE_SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_STORAGE_SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY",
    );
}

export function requireSupabaseEnv() {
    const url = getSupabaseUrl();
    const publishableKey = getSupabasePublishableKey();

    if (!url || !publishableKey) {
        throw new Error(
            "Missing Supabase environment variables. Expected NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or STORAGE_SUPABASE_URL/STORAGE_SUPABASE_PUBLISHABLE_KEY.",
        );
    }

    return { url, publishableKey };
}
