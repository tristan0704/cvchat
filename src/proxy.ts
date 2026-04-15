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
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
