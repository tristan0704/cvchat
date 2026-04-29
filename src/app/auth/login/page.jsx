import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { login } from "./actions";
import { createClient } from "@/db-backend/auth/server-client";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";
  const message = typeof params?.message === "string" ? params.message : "";
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/home");
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-900">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Image
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
          width={40}
          height={40}
          className="mx-auto h-10 w-auto"
          alt="Logo"
        />

        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-white">
          Melde dich in deinem Account an
        </h2>
      </div>

      {/* Form */}
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action={login} className="space-y-6">
          {message ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-100">
                Passwort
              </label>

              <div className="text-sm">
                <Link
                  href="/auth/reset-password"
                  className="font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Passwort vergessen?
                </Link>
              </div>
            </div>

            <div className="mt-2">
              <input
                name="password"
                type="password"
                required
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Button */}
          <div className="flex flex-row gap-x-6 items-center">
            {/* BACK BUTTON */}
            <Link
              href="/"
              className="flex w-full justify-center rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Zurück
            </Link>
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Anmelden
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-10 text-center text-sm text-gray-400">
          Noch kein Konto?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
