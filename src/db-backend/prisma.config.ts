import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "..", "..");
loadEnv({ path: path.join(workspaceRoot, ".env.local") });

const directUrl = process.env.DIRECT_URL?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL in environment.");
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
