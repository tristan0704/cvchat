import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "prisma/config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "..", "..");
const prismaDatasourceUrl =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

export default defineConfig({
    schema: path.join(currentDir, "prisma/schema.prisma"),
    migrations: {
        path: path.join(workspaceRoot, "prisma/migrations"),
    },
    engine: "classic",
    ...(prismaDatasourceUrl
        ? {
              datasource: {
                  url: prismaDatasourceUrl,
              },
          }
        : {}),
});
