import {
    getSupabasePublishableKey,
    getSupabaseUrl,
} from "@/db-backend/env";

export function requireSupabaseEnv() {
    const url = getSupabaseUrl();
    const publishableKey = getSupabasePublishableKey();

    if (!url || !publishableKey) {
        throw new Error(
            "Missing Supabase environment variables. Expected NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or the Vercel-provided SUPBASE_* equivalents.",
        );
    }

    return { url, publishableKey };
}
