// DATEIUEBERSICHT: Singleton fuer Prisma Client, damit in Dev keine Mehrfachinstanzen entstehen.
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient()

if (process.env.NODE_ENV !== "production") {
    // In Dev ueberlebt der Singleton Hot-Reloads und vermeidet viele Verbindungen.
    globalForPrisma.prisma = prisma
}

