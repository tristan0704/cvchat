import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, env } from "prisma/config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    schema: path.join(currentDir, "prisma/schema.prisma"),
    migrations: {
        path: path.join(currentDir, "prisma/migrations"),
    },
    engine: "classic",
    datasource: {
        url: env("DIRECT_URL"),
    },
});
