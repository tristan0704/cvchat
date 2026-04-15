import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/db-backend/auth/server-client";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data.user) {
        await supabase.auth.signOut();
    }

    revalidatePath("/", "layout");

    return NextResponse.redirect(new URL("/auth/login", request.url), {
        status: 302,
    });
}
