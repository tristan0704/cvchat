import "server-only";

import { createClient } from "@/db-backend/auth/server-client";
import { updateProfileAvatarForUser } from "@/db-backend/profile/profile-service";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_FILE_BYTES = 5_000_000;

const ALLOWED_AVATAR_MIME_TYPES = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export function isSupportedAvatarMimeType(value: string) {
    return ALLOWED_AVATAR_MIME_TYPES.has(value);
}

export function getAvatarObjectPath(userId: string) {
    return `${userId}/avatar`;
}

export async function createAvatarUrlForPath(
    avatarPath: string | null
): Promise<string | null> {
    if (!avatarPath) {
        return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(avatarPath, 60 * 60);

    if (error || !data?.signedUrl) {
        return null;
    }

    return data.signedUrl;
}

export async function uploadAvatarForUser(userId: string, file: File) {
    if (!isSupportedAvatarMimeType(file.type)) {
        throw new Error("Bitte ein Bild als PNG, JPG, WEBP oder GIF auswaehlen.");
    }

    if (file.size > MAX_AVATAR_FILE_BYTES) {
        throw new Error("Das Profilbild darf maximal 5 MB gross sein.");
    }

    const avatarPath = getAvatarObjectPath(userId);
    const supabase = await createClient();
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
    });

    if (error) {
        throw new Error(error.message);
    }

    await updateProfileAvatarForUser(userId, {
        avatarPath,
    });

    return {
        avatarPath,
        avatarUrl: await createAvatarUrlForPath(avatarPath),
    };
}

export async function removeAvatarForUser(avatarPath: string | null) {
    if (!avatarPath) {
        return;
    }

    const supabase = await createClient();
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);

    if (error && !error.message.toLowerCase().includes("not found")) {
        throw new Error(error.message);
    }
}
