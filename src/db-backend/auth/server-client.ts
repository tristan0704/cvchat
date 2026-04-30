import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "@/db-backend/auth/env";

// Dateiübersicht:
// Serverseitiger Supabase-Client für Route Handler, Server Actions und Server
// Components. Cookie-Schreibzugriffe sind in Server Components nicht erlaubt;
// der Navigations-Proxy übernimmt dort den Session-Refresh.
export async function createClient() {
    const cookieStore = await cookies();
    const { url, publishableKey } = requireSupabaseEnv();

    return createServerClient(
        url,
        publishableKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Server Components können keine Cookies schreiben;
                        // proxy.ts übernimmt den Refresh bei Seitennavigation.
                    }
                },
            },
        },
    );
}
