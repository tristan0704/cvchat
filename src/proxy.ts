import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/db-backend/auth/session-proxy";

export async function proxy(request: NextRequest) {
    try {
        return await updateSession(request);
    } catch (error) {
        console.error("Failed to update Supabase session in proxy", error);
        return NextResponse.next({
            request,
        });
    }
}

export const config = {
    matcher: [
        // Der Proxy soll nur dort eingreifen, wo Session-Refresh
        // oder geschützte Navigation tatsächlich relevant ist.
        "/home",
        "/learn",
        "/profile",
        "/settings",
        "/interviews/:path*",
        "/api/:path*",
        "/auth/:path*",
    ],
};
