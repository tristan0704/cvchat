import "server-only";

import { createClient } from "@/db-backend/auth/server-client";

export type ApiIdentity = {
    email: string;
    id: string;
};

// API-Hot-Paths brauchen nur eine geprüfte Supabase-Identität. Profil- und
// Settings-Reads bleiben bewusst bei getCurrentAppUser(), damit Polling nicht
// für jede Statusabfrage zusätzliche App-Tabellen lesen muss.
export async function getCurrentApiIdentity(): Promise<ApiIdentity | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;

    if (error || !user?.id || !user.email) {
        return null;
    }

    return {
        email: user.email,
        id: user.id,
    };
}
