import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/db-backend/prisma/client";

export type ActiveCvSummary = {
    id: string;
    fileName: string;
    fileSizeBytes: number | null;
    mimeType: string | null;
    uploadedAt: string;
};

export type ProfileSnapshot = {
    username: string;
    avatarPath: string | null;
    language: string;
    emailNotifications: boolean;
    activeCv: ActiveCvSummary | null;
};

function mapActiveCvSummary(
    cv:
        | {
              id: string;
              fileName: string | null;
              fileSizeBytes: number | null;
              mimeType: string | null;
              uploadedAt: Date;
          }
        | null
) {
    if (!cv) {
        return null;
    }

    return {
        id: cv.id,
        fileName: cv.fileName ?? "Lebenslauf.pdf",
        fileSizeBytes: cv.fileSizeBytes,
        mimeType: cv.mimeType,
        uploadedAt: cv.uploadedAt.toISOString(),
    } satisfies ActiveCvSummary;
}

export async function getProfileSnapshot(userId: string): Promise<ProfileSnapshot> {
    const [profile, settings, cvVersions] = await db.$transaction([
        db.profile.findUnique({
            where: {
                userId,
            },
            select: {
                avatarUrl: true,
                username: true,
            },
        }),
        db.userSettings.findUnique({
            where: {
                userId,
            },
            select: {
                emailNotifications: true,
                language: true,
            },
        }),
        db.cvVersion.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: {
                uploadedAt: "desc",
            },
            take: 1,
            select: {
                id: true,
                fileName: true,
                fileSizeBytes: true,
                mimeType: true,
                uploadedAt: true,
            },
        }),
    ]);

    return {
        username: profile?.username ?? "",
        avatarPath: profile?.avatarUrl ?? null,
        language: settings?.language ?? "de",
        emailNotifications: settings?.emailNotifications ?? true,
        activeCv: mapActiveCvSummary(cvVersions[0] ?? null),
    };
}

export async function updateProfileUsernameForUser(
    userId: string,
    args: {
        username: string;
    }
) {
    const username = args.username.trim();

    return db.profile.update({
        where: {
            userId,
        },
        data: {
            username: username.length > 0 ? username : null,
        },
    });
}

export async function updateProfileAvatarForUser(
    userId: string,
    args: {
        avatarPath: string | null;
    }
) {
    return db.profile.update({
        where: {
            userId,
        },
        data: {
            avatarUrl: args.avatarPath,
        },
    });
}

export async function updateUserSettingsForUser(
    userId: string,
    args: {
        language: string;
        emailNotifications: boolean;
    }
) {
    return db.userSettings.update({
        where: {
            userId,
        },
        data: {
            language: args.language.trim() || "de",
            emailNotifications: args.emailNotifications,
        },
    });
}

export function isUniqueConstraintError(
    error: unknown,
    fieldName?: string
): error is Prisma.PrismaClientKnownRequestError {
    if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
    ) {
        return false;
    }

    if (!fieldName) {
        return true;
    }

    const target = Array.isArray(error.meta?.target)
        ? error.meta?.target
        : typeof error.meta?.target === "string"
          ? [error.meta.target]
          : [];

    return target.includes(fieldName);
}
