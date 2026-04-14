import Link from "next/link";
import { redirect } from "next/navigation";

import { signup } from "./actions";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (claimsData?.claims) {
    redirect("/home");
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-900 overflow-hidden">

      {/* HEADER */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
          className="mx-auto h-10 w-auto"
          alt="Logo"
        />

        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-white">
          Erstelle deinen Account
        </h2>
      </div>

      {/* FORM */}
      <div className="relative z-10 mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action={signup} className="space-y-6">
          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-100">
              E-Mail-Adresse
            </label>
            <div className="mt-2">
              <input
                name="email"
                type="email"
                required
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-100">
              Passwort
            </label>
            <div className="mt-2">
              <input
                name="password"
                type="password"
                required
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-100">
              Passwort bestätigen
            </label>
            <div className="mt-2">
              <input
                name="confirmPassword"
                type="password"
                required
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-x-6 items-stretch">
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Zurück
            </Link>

            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Account erstellen
            </button>
          </div>

        </form>

        {/* FOOTER */}
        <p className="mt-10 text-center text-sm text-gray-400">
          Bereits registriert?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Anmelden
          </Link>
        </p>
      </div>

    </div>
  );
}
