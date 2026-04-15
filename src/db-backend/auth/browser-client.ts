import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "@/db-backend/auth/env";

export function createClient() {
    const { url, publishableKey } = requireSupabaseEnv();

    return createBrowserClient(
        url,
        publishableKey,
    );
}
