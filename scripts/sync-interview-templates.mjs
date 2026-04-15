import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

import { getInterviewQuestionPool } from "../src/lib/interview.ts";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "..");

loadEnv({ path: path.join(workspaceRoot, ".env.local") });

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
        process.env.SUPBASE_POSTGRES_PRISMA_URL ??
        process.env.SUPBASE_POSTGRES_URL ??
        "";
}

if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL =
        process.env.SUPBASE_POSTGRES_URL_NON_POOLING ??
        process.env.SUPBASE_POSTGRES_URL ??
        "";
}

const prisma = new PrismaClient({
    log: ["error"],
});

const ROLE_DEFINITIONS = [
    {
        role: "Frontend Developer",
        roleKey: "frontend",
        summary:
            "Fokus auf produktnahe Frontend-Entwicklung, stabile UI-Flows und saubere technische Entscheidungen.",
    },
    {
        role: "Backend Developer",
        roleKey: "backend",
        summary:
            "Fokus auf APIs, Datenkonsistenz, Produktionsthemen und belastbare Backend-Entscheidungen.",
    },
    {
        role: "Fullstack Developer",
        roleKey: "fullstack",
        summary:
            "Fokus auf End-to-End-Ownership, saubere Feature-Schnitte und abgestimmte Frontend-/Backend-Entscheidungen.",
    },
];

const EXPERIENCES = ["Junior", "Mid", "Senior"];
const COMPANY_SIZES = ["Startup", "Mittelstand", "Konzern"];
const INTERVIEW_TYPES = [
    "HR Interview",
    "Technical Interview",
    "Case Interview",
];

function slugify(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function buildTemplateId({ roleKey, experience, companySize, interviewType }) {
    return [
        roleKey,
        slugify(experience),
        slugify(companySize),
        slugify(interviewType),
    ].join("-");
}

function isGeneralQuestion(questionId) {
    return (
        questionId.startsWith("motivation") ||
        questionId.startsWith("project-impact") ||
        questionId.startsWith("delivery-under-pressure") ||
        questionId.startsWith("feedback") ||
        questionId.startsWith("intern-")
    );
}

async function main() {
    const taskManifestPath = path.join(
        workspaceRoot,
        "src",
        "lib",
        "coding-challenge",
        "tasks.json"
    );
    const taskManifest = JSON.parse(await fs.readFile(taskManifestPath, "utf8"));

    for (const task of taskManifest.tasks) {
        await prisma.codingChallengeTask.upsert({
            where: { id: task.id },
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
            where: { taskId: task.id },
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

    const questionMap = new Map();

    for (const roleDefinition of ROLE_DEFINITIONS) {
        for (const question of getInterviewQuestionPool(roleDefinition.role)) {
            if (!questionMap.has(question.id)) {
                questionMap.set(question.id, {
                    id: question.id,
                    roleKey: isGeneralQuestion(question.id)
                        ? null
                        : roleDefinition.roleKey,
                    isGeneral: isGeneralQuestion(question.id),
                    text: question.text,
                    priority: question.priority,
                });
            }
        }
    }

    for (const question of questionMap.values()) {
        await prisma.interviewQuestionLibrary.upsert({
            where: {
                id: question.id,
            },
            update: {
                roleKey: question.roleKey,
                isGeneral: question.isGeneral,
                text: question.text,
                priority: question.priority,
                isActive: true,
            },
            create: {
                id: question.id,
                roleKey: question.roleKey,
                isGeneral: question.isGeneral,
                text: question.text,
                priority: question.priority,
                isActive: true,
            },
        });
    }

    for (const roleDefinition of ROLE_DEFINITIONS) {
        const questionPlan = getInterviewQuestionPool(roleDefinition.role);
        const codingTasks = await prisma.codingChallengeTask.findMany({
            where: {
                role: roleDefinition.roleKey,
                isActive: true,
            },
            orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
            },
        });

        for (const experience of EXPERIENCES) {
            for (const companySize of COMPANY_SIZES) {
                for (const interviewType of INTERVIEW_TYPES) {
                    const templateId = buildTemplateId({
                        roleKey: roleDefinition.roleKey,
                        experience,
                        companySize,
                        interviewType,
                    });

                    await prisma.interviewTemplate.upsert({
                        where: {
                            id: templateId,
                        },
                        update: {
                            title: `${roleDefinition.role} Interview`,
                            role: roleDefinition.role,
                            roleKey: roleDefinition.roleKey,
                            experience,
                            companySize,
                            interviewType,
                            summary: `${roleDefinition.summary} Konfiguration fuer ${experience}, ${companySize} und ${interviewType}.`,
                            isActive: true,
                            sortOrder: ROLE_DEFINITIONS.findIndex(
                                (item) => item.roleKey === roleDefinition.roleKey
                            ),
                        },
                        create: {
                            id: templateId,
                            title: `${roleDefinition.role} Interview`,
                            role: roleDefinition.role,
                            roleKey: roleDefinition.roleKey,
                            experience,
                            companySize,
                            interviewType,
                            summary: `${roleDefinition.summary} Konfiguration fuer ${experience}, ${companySize} und ${interviewType}.`,
                            isActive: true,
                            sortOrder: ROLE_DEFINITIONS.findIndex(
                                (item) => item.roleKey === roleDefinition.roleKey
                            ),
                        },
                    });

                    await prisma.interview.updateMany({
                        where: {
                            templateId: null,
                            role: roleDefinition.role,
                            experience,
                            companySize,
                            interviewType,
                        },
                        data: {
                            templateId,
                        },
                    });

                    await prisma.interviewTemplateQuestion.deleteMany({
                        where: {
                            templateId,
                        },
                    });

                    await prisma.interviewTemplateQuestion.createMany({
                        data: questionPlan.map((question, index) => ({
                            templateId,
                            questionId: question.id,
                            sequence: index + 1,
                            priority: question.priority,
                        })),
                    });

                    await prisma.interviewTemplateCodingChallenge.deleteMany({
                        where: {
                            templateId,
                        },
                    });

                    if (codingTasks.length > 0) {
                        await prisma.interviewTemplateCodingChallenge.createMany({
                            data: codingTasks.map((task, index) => ({
                                templateId,
                                taskId: task.id,
                                sequence: index + 1,
                                isDefault: index === 0,
                            })),
                        });
                    }
                }
            }
        }
    }

    const [templateCount, questionCount, templateQuestionCount, templateCodingCount] =
        await Promise.all([
            prisma.interviewTemplate.count(),
            prisma.interviewQuestionLibrary.count(),
            prisma.interviewTemplateQuestion.count(),
            prisma.interviewTemplateCodingChallenge.count(),
        ]);

    console.log(
        JSON.stringify(
            {
                templateCount,
                questionCount,
                templateQuestionCount,
                templateCodingCount,
            },
            null,
            2
        )
    );
}

try {
    await main();
} finally {
    await prisma.$disconnect();
}
