"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { provisionCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { createClient } from "@/db-backend/auth/server-client";

function redirectWithError(message: string) {
    redirect(`/auth/register?error=${encodeURIComponent(message)}`);
}

export async function signup(formData: FormData) {
    const supabase = await createClient();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!email || !password || !confirmPassword) {
        redirectWithError("Bitte alle Felder ausfüllen.");
    }

    if (password !== confirmPassword) {
        redirectWithError("Die Passwörter stimmen nicht überein.");
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        redirectWithError(error.message);
    }

    revalidatePath("/", "layout");

    if (data.session) {
        await provisionCurrentAppUser();
        redirect("/auth/register/step2");
    }

    redirect(
        "/auth/login?message=" +
            encodeURIComponent("Bitte bestätige zuerst deine E-Mail-Adresse."),
    );
}
