// DATEIUEBERSICHT: Initialisiert den Supabase-Client fuer Storage-Zugriffe.
export const runtime = "nodejs"

import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

