import "server-only";

import { db } from "@/db-backend/prisma/client";
import { ensureCodingChallengeTasksSeeded } from "@/db-backend/coding-challenge/coding-challenge-service";
import type { InterviewCvConfig } from "@/lib/cv/types";
import { getInterviewQuestionPool } from "@/lib/interview";

export type InterviewTemplateSummary = {
    id: string;
    title: string;
    role: string;
    roleKey: string;
    experience: string;
    companySize: string;
    interviewType: string;
    summary: string;
};

export type InterviewTemplateCatalog = {
    roles: string[];
    experiences: string[];
    companySizes: string[];
    interviewTypes: string[];
    templates: InterviewTemplateSummary[];
};

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
] as const;

const EXPERIENCES = ["Junior", "Mid", "Senior"] as const;
const COMPANY_SIZES = ["Startup", "Mittelstand", "Konzern"] as const;
const INTERVIEW_TYPES = [
    "HR Interview",
    "Technical Interview",
    "Case Interview",
] as const;
const EXPECTED_TEMPLATE_COUNT =
    ROLE_DEFINITIONS.length *
    EXPERIENCES.length *
    COMPANY_SIZES.length *
    INTERVIEW_TYPES.length;

function compareText(left: string, right: string) {
    return left.localeCompare(right, "de", { sensitivity: "base" });
}

function normalizeConfigValue(value: string) {
    return value.trim();
}

function slugify(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildTemplateId(args: {
    roleKey: string;
    experience: string;
    companySize: string;
    interviewType: string;
}) {
    return [
        args.roleKey,
        slugify(args.experience),
        slugify(args.companySize),
        slugify(args.interviewType),
    ].join("-");
}

async function ensureInterviewTemplatesSeeded() {
    await ensureCodingChallengeTasksSeeded();

    const templateCount = await db.interviewTemplate.count();
    if (templateCount >= EXPECTED_TEMPLATE_COUNT) {
        return;
    }

    const questionMap = new Map<
        string,
        {
            id: string;
            roleKey: string | null;
            isGeneral: boolean;
            text: string;
            priority: number;
        }
    >();

    for (const roleDefinition of ROLE_DEFINITIONS) {
        for (const question of getInterviewQuestionPool(roleDefinition.role)) {
            const isGeneral =
                question.id.startsWith("motivation") ||
                question.id.startsWith("project-impact") ||
                question.id.startsWith("delivery-under-pressure") ||
                question.id.startsWith("feedback") ||
                question.id.startsWith("intern-");

            if (!questionMap.has(question.id)) {
                questionMap.set(question.id, {
                    id: question.id,
                    roleKey: isGeneral ? null : roleDefinition.roleKey,
                    isGeneral,
                    text: question.text,
                    priority: question.priority,
                });
            }
        }
    }

    for (const question of questionMap.values()) {
        await db.interviewQuestionLibrary.upsert({
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
        const codingTasks = await db.codingChallengeTask.findMany({
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

                    await db.interviewTemplate.upsert({
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

                    await db.interview.updateMany({
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

                    await db.interviewTemplateQuestion.deleteMany({
                        where: {
                            templateId,
                        },
                    });

                    await db.interviewTemplateQuestion.createMany({
                        data: questionPlan.map((question, index) => ({
                            templateId,
                            questionId: question.id,
                            sequence: index + 1,
                            priority: question.priority,
                        })),
                    });

                    await db.interviewTemplateCodingChallenge.deleteMany({
                        where: {
                            templateId,
                        },
                    });

                    if (codingTasks.length > 0) {
                        await db.interviewTemplateCodingChallenge.createMany({
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
}

function mapTemplateSummary(template: {
    id: string;
    title: string;
    role: string;
    roleKey: string;
    experience: string;
    companySize: string;
    interviewType: string;
    summary: string | null;
}) {
    return {
        id: template.id,
        title: template.title,
        role: template.role,
        roleKey: template.roleKey,
        experience: template.experience,
        companySize: template.companySize,
        interviewType: template.interviewType,
        summary: template.summary ?? "",
    } satisfies InterviewTemplateSummary;
}

export async function listInterviewTemplateCatalog(): Promise<InterviewTemplateCatalog> {
    await ensureInterviewTemplatesSeeded();

    const templates = await db.interviewTemplate.findMany({
        where: {
            isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
            id: true,
            title: true,
            role: true,
            roleKey: true,
            experience: true,
            companySize: true,
            interviewType: true,
            summary: true,
        },
    });

    const summaries = templates.map(mapTemplateSummary);

    return {
        roles: [...new Set(summaries.map((item) => item.role))].sort(compareText),
        experiences: [...new Set(summaries.map((item) => item.experience))].sort(
            compareText
        ),
        companySizes: [
            ...new Set(summaries.map((item) => item.companySize)),
        ].sort(compareText),
        interviewTypes: [
            ...new Set(summaries.map((item) => item.interviewType)),
        ].sort(compareText),
        templates: summaries,
    };
}

export async function getInterviewTemplateById(templateId: string) {
    await ensureInterviewTemplatesSeeded();

    const normalizedTemplateId = templateId.trim();

    if (!normalizedTemplateId) {
        return null;
    }

    return db.interviewTemplate.findFirst({
        where: {
            id: normalizedTemplateId,
            isActive: true,
        },
        include: {
            questions: {
                orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
                include: {
                    question: true,
                },
            },
            codingChallenges: {
                orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
                include: {
                    task: true,
                },
            },
        },
    });
}

export async function resolveInterviewTemplateForConfig(
    config: InterviewCvConfig
) {
    await ensureInterviewTemplatesSeeded();

    const role = normalizeConfigValue(config.role);
    const experience = normalizeConfigValue(config.experience);
    const companySize = normalizeConfigValue(config.companySize);
    const interviewType = normalizeConfigValue(config.interviewType);

    if (!role || !experience || !companySize || !interviewType) {
        return null;
    }

    return db.interviewTemplate.findUnique({
        where: {
            role_experience_companySize_interviewType: {
                role,
                experience,
                companySize,
                interviewType,
            },
        },
        include: {
            questions: {
                orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
                include: {
                    question: true,
                },
            },
            codingChallenges: {
                orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
                include: {
                    task: true,
                },
            },
        },
    });
}
