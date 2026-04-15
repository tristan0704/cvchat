import "server-only";

import { PrismaClient } from "@prisma/client";
import { applyEnvAliases } from "@/db-backend/env";

applyEnvAliases();

const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: PrismaClient;
};

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
