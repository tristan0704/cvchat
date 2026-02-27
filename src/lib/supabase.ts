// DATEIUEBERSICHT: Initialisiert den Supabase-Client fuer Storage-Zugriffe (lazy, um Crashes bei fehlenden Env-Vars zu vermeiden).
export const runtime = "nodejs"

import { createClient, SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) {
            throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        }
        _supabase = createClient(url, key)
    }
    return _supabase
}

