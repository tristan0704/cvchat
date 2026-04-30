import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseEnv } from "@/db-backend/auth/env";

// Dateiübersicht:
// Dieser Proxy-Helfer aktualisiert Supabase-Session-Cookies nur für
// Seitennavigation. API-Routen laufen bewusst ohne Proxy und prüfen Auth im
// jeweiligen Handler, damit Hot-Path-Requests keine doppelte Auth-Arbeit zahlen.
function hasSupabaseSessionCookie(request: NextRequest) {
    return request.cookies.getAll().some((cookie) => {
        const cookieName = cookie.name.toLowerCase();

        return (
            cookieName.startsWith("sb-") &&
            cookieName.includes("auth-token")
        );
    });
}

export async function updateSession(request: NextRequest) {
    // Ohne Supabase-Session-Cookies lohnt sich kein teurer Refresh-Pfad.
    if (!hasSupabaseSessionCookie(request)) {
        return NextResponse.next({
            request,
        });
    }

    let supabaseResponse = NextResponse.next({
        request,
    });
    const { url, publishableKey } = requireSupabaseEnv();

    const supabase = createServerClient(
        url,
        publishableKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet, headers) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

                    supabaseResponse = NextResponse.next({
                        request,
                    });

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );

                    Object.entries(headers).forEach(([key, value]) =>
                        supabaseResponse.headers.set(key, value),
                    );
                },
            },
        },
    );

    await supabase.auth.getUser();

    return supabaseResponse;
}
