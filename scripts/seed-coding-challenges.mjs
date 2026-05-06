import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function readFirstDefined(...keys) {
    for (const key of keys) {
        const value = process.env[key]?.trim();

        if (value) {
            return value;
        }
    }

    return null;
}

function applyDatabaseEnvAliases() {
    const databaseUrl = readFirstDefined(
        "DATABASE_URL",
        "SUPBASE_POSTGRES_PRISMA_URL",
        "SUPBASE_POSTGRES_URL",
    );
    const directUrl = readFirstDefined(
        "DIRECT_URL",
        "SUPBASE_POSTGRES_URL_NON_POOLING",
        "SUPBASE_POSTGRES_URL",
    );

    if (databaseUrl && !process.env.DATABASE_URL) {
        process.env.DATABASE_URL = databaseUrl;
    }

    if (directUrl && !process.env.DIRECT_URL) {
        process.env.DIRECT_URL = directUrl;
    }
}

applyDatabaseEnvAliases();

const prisma = new PrismaClient();
const manifestUrl = new URL("../src/lib/coding-challenge/tasks.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

try {
    for (const task of manifest.tasks) {
        await prisma.codingChallengeTask.upsert({
            where: {
                id: task.id,
            },
            update: {
                name: task.name,
                role: task.role,
                language: task.language,
                difficulty: task.difficulty,
                estimatedMinutes: task.estimatedMinutes,
                description: task.description,
                statement: task.statement,
                requirements: task.requirements,
                evaluationFocus: task.evaluationFocus,
                starterCode: task.starterCode,
                examples: task.examples,
                localizedContent: task.localizedContent ?? undefined,
                isActive: true,
            },
            create: {
                id: task.id,
                name: task.name,
                role: task.role,
                language: task.language,
                difficulty: task.difficulty,
                estimatedMinutes: task.estimatedMinutes,
                description: task.description,
                statement: task.statement,
                requirements: task.requirements,
                evaluationFocus: task.evaluationFocus,
                starterCode: task.starterCode,
                examples: task.examples,
                localizedContent: task.localizedContent ?? undefined,
                isActive: true,
            },
        });

        await prisma.codingChallengeTaskSolution.upsert({
            where: {
                taskId: task.id,
            },
            update: {
                approach: task.solution.approach,
                code: task.solution.code,
            },
            create: {
                taskId: task.id,
                approach: task.solution.approach,
                code: task.solution.code,
            },
        });
    }

    console.info(`Seeded ${manifest.tasks.length} coding challenge tasks.`);
} finally {
    await prisma.$disconnect();
}
