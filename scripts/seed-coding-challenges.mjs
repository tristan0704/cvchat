import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

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
