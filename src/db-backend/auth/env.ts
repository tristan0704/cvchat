export function getSupabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

export function getSupabasePublishableKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null;
}

export function requireSupabaseEnv() {
    const url = getSupabaseUrl();
    const publishableKey = getSupabasePublishableKey();

    if (!url || !publishableKey) {
        throw new Error(
            "Missing Supabase environment variables. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
        );
    }

    return { url, publishableKey };
}
