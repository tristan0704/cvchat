export const runtime = "nodejs"

import { supabase } from "@/lib/supabase"

export async function uploadProfileImage(
    file: File,
    token: string
): Promise<string | null> {
    try {
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

        return data?.publicUrl ?? null
    } catch (err) {
        console.error("Unexpected upload error:", err)
        return null
    }
}
