import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";
import { applyEnvAliases, getDatabaseUrl, getDirectUrl } from "./env";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "..", "..");
loadEnv({ path: path.join(workspaceRoot, ".env.local") });
applyEnvAliases();

const directUrl = getDirectUrl();
const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
    throw new Error("Missing database environment variables. Expected DATABASE_URL or the Vercel-provided SUPBASE_POSTGRES_* values.");
}

export default defineConfig({
    schema: path.join(currentDir, "prisma/schema.prisma"),
    migrations: {
        path: path.join(workspaceRoot, "prisma/migrations"),
    },
    engine: "classic",
    datasource: {
        url: directUrl || databaseUrl,
    },
});
