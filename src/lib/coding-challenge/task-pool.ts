import "server-only";

import taskManifest from "@/lib/coding-challenge/tasks.json";
import type {
  CodingChallengeRole,
  CodingChallengeTask,
  CodingChallengeTaskManifest,
  PublicCodingChallengeTask,
} from "@/lib/coding-challenge/types";

const tasks = (taskManifest as CodingChallengeTaskManifest).tasks;

export function normalizeCodingChallengeRole(role: string): CodingChallengeRole {
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

export function getCodingChallengeTaskById(taskId: string) {
  return tasks.find((task) => task.id === taskId) ?? null;
}

export function getCodingChallengeTasksForRole(role: string) {
  const normalizedRole = normalizeCodingChallengeRole(role);
  const roleTasks = tasks.filter((task) => task.role === normalizedRole);

  if (roleTasks.length > 0) {
    return roleTasks;
  }

  return tasks.filter((task) => task.role === "fullstack");
}

export function pickRandomCodingChallengeTask(
  role: string,
  excludeTaskId?: string
) {
  const roleTasks = getCodingChallengeTasksForRole(role);
  const availableTasks =
    excludeTaskId && roleTasks.length > 1
      ? roleTasks.filter((task) => task.id !== excludeTaskId)
      : roleTasks;

  const randomIndex = Math.floor(Math.random() * availableTasks.length);
  return availableTasks[randomIndex] ?? roleTasks[0] ?? tasks[0];
}

export function toPublicCodingChallengeTask(
  task: CodingChallengeTask
): PublicCodingChallengeTask {
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
