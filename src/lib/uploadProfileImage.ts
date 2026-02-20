// DATEIUEBERSICHT: Upload von Profilbildern nach Supabase Storage und Rueckgabe der Public-URL.
export const runtime = "nodejs"

import { supabase } from "@/lib/supabase"

export async function uploadProfileImage(
    file: File,
    token: string
): Promise<string | null> {
    try {
        // Dateiname wird am CV-Token orientiert, damit Bild und Profil zusammenpassen.
        const buffer = Buffer.from(await file.arrayBuffer())
        const ext = file.type.split("/")[1]
        const path = `${token}/profile.${ext}`

        const { error } = await supabase.storage
            .from("cv-images")
            .upload(path, buffer, {
                contentType: file.type,
                upsert: true,
            })

        if (error) {
            console.error("Supabase upload failed:", error)
            return null
        }

        const { data } = supabase.storage
            .from("cv-images")
            .getPublicUrl(path)

        // Null statt Exception: API kann danach kontrolliert weiterlaufen.
        return data?.publicUrl ?? null
    } catch (err) {
        console.error("Unexpected upload error:", err)
        return null
    }
}

