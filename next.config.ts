// DATEIUEBERSICHT: Zentrale Next.js-Konfiguration fuer Build-Verhalten und Compiler-Optionen.
import type { NextConfig } from "next";

const nextPublicSupabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPBASE_SUPABASE_URL ??
    process.env.SUPBASE_SUPABASE_SUPABASE_URL;
const nextPublicSupabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPBASE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPBASE_SUPABASE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPBASE_SUPABASE_ANON_KEY ??
    process.env.SUPBASE_SUPABASE_SUPABASE_ANON_KEY;

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: nextPublicSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nextPublicSupabasePublishableKey,
  },
  // Workaround for Windows EPERM spawn during Next internal type-check step.
  // CI/local quality gate should run `npm run typecheck` explicitly.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
