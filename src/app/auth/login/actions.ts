"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/db-backend/auth/server-client";

function redirectWithError(message: string) {
    redirect(`/auth/login?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
    const supabase = await createClient();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
        redirectWithError("Bitte E-Mail und Passwort eingeben.");
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        redirectWithError(error.message);
    }

    revalidatePath("/", "layout");
    redirect("/home");
}
