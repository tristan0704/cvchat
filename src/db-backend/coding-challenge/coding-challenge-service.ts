import "server-only";

import type {
    CodingChallengeAttempt,
    CodingChallengeEvaluation,
    CodingChallengeTask,
    CodingChallengeTaskSolution,
} from "@prisma/client";

import taskManifest from "@/lib/coding-challenge/tasks.json";
import { acquireTransactionalAdvisoryLock } from "@/db-backend/prisma/advisory-lock";
import { db } from "@/db-backend/prisma/client";
import { evaluateCodingChallengeSubmission } from "@/lib/coding-challenge/server/evaluate-submission";
import type {
    CodingChallengeEvaluation as CodingChallengeEvaluationResult,
    CodingChallengeTask as CodingChallengeTaskWithSolution,
    CodingChallengeTaskManifest,
    CodingChallengeRole,
    PublicCodingChallengeTask,
} from "@/lib/coding-challenge/types";

const manifestTasks = (taskManifest as CodingChallengeTaskManifest).tasks;

function normalizeCodingChallengeRole(role: string): CodingChallengeRole {
    const normalized = role.trim().toLowerCase();

    if (
        normalized.includes("front") ||
        normalized.includes("react") ||
        normalized.includes("ui")
    ) {
        return "frontend";
    }

    if (normalized.includes("full")) {
        return "fullstack";
    }

    if (
        normalized.includes("back") ||
        normalized.includes("api") ||
        normalized.includes("node") ||
        normalized.includes("java")
    ) {
        return "backend";
    }

    return "fullstack";
}

function toPublicTask(task: CodingChallengeTask): PublicCodingChallengeTask {
    return {
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
    };
}

function toTaskWithSolution(args: {
    task: CodingChallengeTask;
    solution: CodingChallengeTaskSolution;
}): CodingChallengeTaskWithSolution {
    return {
        ...toPublicTask(args.task),
        solution: {
            approach: args.solution.approach,
            code: args.solution.code,
        },
    };
}

function mapEvaluation(
    evaluation: CodingChallengeEvaluation,
    attemptId: string
): CodingChallengeEvaluationResult {
    return {
        attemptId,
        taskId: evaluation.taskId,
        submittedAt: evaluation.submittedAt.toISOString(),
        overallScore: evaluation.overallScore,
        passedLikely: evaluation.passedLikely,
        summary: evaluation.summary,
        correctness: {
            score: evaluation.correctnessScore,
            feedback: evaluation.correctnessFeedback,
        },
        codeQuality: {
            score: evaluation.codeQualityScore,
            feedback: evaluation.codeQualityFeedback,
        },
        problemSolving: {
            score: evaluation.problemSolvingScore,
            feedback: evaluation.problemSolvingFeedback,
        },
        strengths: evaluation.strengths,
        issues: evaluation.issues,
        improvements: evaluation.improvements,
    };
}

function mapDraft(args: {
    attempt: CodingChallengeAttempt;
    task: CodingChallengeTask;
    evaluation?: CodingChallengeEvaluation | null;
}) {
    return {
        attemptId: args.attempt.id,
        task: toPublicTask(args.task),
        code: args.attempt.draftCode,
        evaluation: args.evaluation
            ? mapEvaluation(args.evaluation, args.attempt.id)
            : null,
        status: args.attempt.status,
        submittedAt: args.attempt.submittedAt?.toISOString() ?? null,
        lastEditedAt: args.attempt.lastEditedAt?.toISOString() ?? null,
    };
}

export async function ensureCodingChallengeTasksSeeded() {
    const taskCount = await db.codingChallengeTask.count();
    if (taskCount >= manifestTasks.length) {
        return;
    }

    for (const task of manifestTasks) {
        await db.codingChallengeTask.upsert({
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

        await db.codingChallengeTaskSolution.upsert({
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
}

async function getOwnedInterview(userId: string, interviewId: string) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        include: {
            feedback: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    return interview;
}

export async function getLatestCodingChallengeAttempt(
    userId: string,
    interviewId: string
) {
    await ensureCodingChallengeTasksSeeded();
    await getOwnedInterview(userId, interviewId);

    const attempt = await db.codingChallengeAttempt.findFirst({
        where: {
            interviewId,
        },
        orderBy: {
            attemptNumber: "desc",
        },
        include: {
            task: true,
            evaluation: true,
        },
    });

    if (!attempt) {
        return null;
    }

    return mapDraft({
        attempt,
        task: attempt.task,
        evaluation: attempt.evaluation,
    });
}

export async function assignCodingChallengeAttempt(args: {
    userId: string;
    interviewId: string;
    role: string;
    excludeTaskId?: string;
}) {
    await ensureCodingChallengeTasksSeeded();
    const interview = await getOwnedInterview(args.userId, args.interviewId);

    if (!interview.feedback) {
        throw new Error("Interview feedback must be completed first");
    }

    return db.$transaction(async (tx) => {
        await acquireTransactionalAdvisoryLock(
            tx,
            "coding-challenge-attempt",
            interview.id
        );

        if (!args.excludeTaskId) {
            const latestAttempt = await tx.codingChallengeAttempt.findFirst({
                where: {
                    interviewId: interview.id,
                },
                orderBy: {
                    attemptNumber: "desc",
                },
                include: {
                    task: true,
                    evaluation: true,
                },
            });

            if (latestAttempt) {
                return mapDraft({
                    attempt: latestAttempt,
                    task: latestAttempt.task,
                    evaluation: latestAttempt.evaluation,
                });
            }
        }

        const roleTasks = await tx.codingChallengeTask.findMany({
            where: {
                isActive: true,
                role: normalizeCodingChallengeRole(args.role),
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        const fallbackTasks =
            roleTasks.length > 0
                ? roleTasks
                : await tx.codingChallengeTask.findMany({
                      where: {
                          isActive: true,
                          role: "fullstack",
                      },
                      orderBy: {
                          createdAt: "asc",
                      },
                  });

        const availableTasks =
            args.excludeTaskId && fallbackTasks.length > 1
                ? fallbackTasks.filter((task) => task.id !== args.excludeTaskId)
                : fallbackTasks;

        const taskPool =
            availableTasks.length > 0 ? availableTasks : fallbackTasks;
        const selectedTask =
            taskPool[Math.floor(Math.random() * taskPool.length)] ?? taskPool[0];

        if (!selectedTask) {
            throw new Error("No coding challenge available");
        }

        const latestAttempt = await tx.codingChallengeAttempt.findFirst({
            where: {
                interviewId: interview.id,
            },
            orderBy: {
                attemptNumber: "desc",
            },
            select: {
                attemptNumber: true,
            },
        });

        const attempt = await tx.codingChallengeAttempt.create({
            data: {
                interviewId: interview.id,
                taskId: selectedTask.id,
                attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
                status: "assigned",
                draftCode: selectedTask.starterCode,
                taskSnapshot: toPublicTask(selectedTask),
            },
        });

        return mapDraft({
            attempt,
            task: selectedTask,
        });
    });
}

export async function updateCodingChallengeDraft(args: {
    userId: string;
    interviewId: string;
    attemptId: string;
    code: string;
}) {
    await getOwnedInterview(args.userId, args.interviewId);

    const attempt = await db.codingChallengeAttempt.findFirst({
        where: {
            id: args.attemptId,
            interviewId: args.interviewId,
            interview: {
                userId: args.userId,
            },
        },
        include: {
            task: true,
            evaluation: true,
        },
    });

    if (!attempt) {
        throw new Error("Coding challenge attempt not found");
    }

    const updatedAttempt = await db.codingChallengeAttempt.update({
        where: {
            id: attempt.id,
        },
        data: {
            draftCode: args.code,
            lastEditedAt: new Date(),
            status:
                attempt.status === "evaluated" ? attempt.status : "draft",
        },
        include: {
            task: true,
            evaluation: true,
        },
    });

    return mapDraft({
        attempt: updatedAttempt,
        task: updatedAttempt.task,
        evaluation: updatedAttempt.evaluation,
    });
}

export async function evaluateCodingChallengeAttempt(args: {
    userId: string;
    interviewId: string;
    attemptId: string;
    code: string;
}) {
    await getOwnedInterview(args.userId, args.interviewId);

    const attempt = await db.codingChallengeAttempt.findFirst({
        where: {
            id: args.attemptId,
            interviewId: args.interviewId,
            interview: {
                userId: args.userId,
            },
        },
        include: {
            task: {
                include: {
                    solution: true,
                },
            },
            evaluation: true,
        },
    });

    if (!attempt || !attempt.task.solution) {
        throw new Error("Coding challenge not found");
    }

    if (attempt.evaluation && attempt.submittedCode === args.code) {
        return {
            draft: mapDraft({
                attempt,
                task: attempt.task,
                evaluation: attempt.evaluation,
            }),
            evaluation: mapEvaluation(attempt.evaluation, attempt.id),
        };
    }

    const evaluationResult = await evaluateCodingChallengeSubmission(
        toTaskWithSolution({
            task: attempt.task,
            solution: attempt.task.solution,
        }),
        args.code
    );

    const updatedAttempt = await db.codingChallengeAttempt.update({
        where: {
            id: attempt.id,
        },
        data: {
            draftCode: args.code,
            submittedCode: args.code,
            submittedAt: new Date(evaluationResult.submittedAt),
            lastEditedAt: new Date(),
            status: "evaluated",
        },
    });

    const evaluation = await db.codingChallengeEvaluation.upsert({
        where: {
            codingChallengeAttemptId: attempt.id,
        },
        update: {
            taskId: attempt.taskId,
            submittedAt: new Date(evaluationResult.submittedAt),
            overallScore: evaluationResult.overallScore,
            passedLikely: evaluationResult.passedLikely,
            summary: evaluationResult.summary,
            correctnessScore: evaluationResult.correctness.score,
            correctnessFeedback: evaluationResult.correctness.feedback,
            codeQualityScore: evaluationResult.codeQuality.score,
            codeQualityFeedback: evaluationResult.codeQuality.feedback,
            problemSolvingScore: evaluationResult.problemSolving.score,
            problemSolvingFeedback: evaluationResult.problemSolving.feedback,
            strengths: evaluationResult.strengths,
            issues: evaluationResult.issues,
            improvements: evaluationResult.improvements,
        },
        create: {
            codingChallengeAttemptId: attempt.id,
            taskId: attempt.taskId,
            submittedAt: new Date(evaluationResult.submittedAt),
            overallScore: evaluationResult.overallScore,
            passedLikely: evaluationResult.passedLikely,
            summary: evaluationResult.summary,
            correctnessScore: evaluationResult.correctness.score,
            correctnessFeedback: evaluationResult.correctness.feedback,
            codeQualityScore: evaluationResult.codeQuality.score,
            codeQualityFeedback: evaluationResult.codeQuality.feedback,
            problemSolvingScore: evaluationResult.problemSolving.score,
            problemSolvingFeedback: evaluationResult.problemSolving.feedback,
            strengths: evaluationResult.strengths,
            issues: evaluationResult.issues,
            improvements: evaluationResult.improvements,
        },
    });

    return {
        draft: mapDraft({
            attempt: updatedAttempt,
            task: attempt.task,
            evaluation,
        }),
        evaluation: mapEvaluation(evaluation, attempt.id),
    };
}
