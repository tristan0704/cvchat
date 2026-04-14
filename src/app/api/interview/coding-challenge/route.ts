import {
  getCodingChallengeTaskById,
  pickRandomCodingChallengeTask,
  toPublicCodingChallengeTask,
} from "@/lib/coding-challenge/task-pool";
import { evaluateCodingChallengeSubmission } from "@/lib/coding-challenge/server/evaluate-submission";
import type { CodingChallengeEvaluationRequest } from "@/lib/coding-challenge/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? "";
  const excludeTaskId = searchParams.get("excludeTaskId") ?? undefined;

  try {
    const task = pickRandomCodingChallengeTask(role, excludeTaskId);

    return Response.json({
      task: toPublicCodingChallengeTask(task),
    });
  } catch (error) {
    console.error("[api/interview/coding-challenge]", error);
    return Response.json(
      { error: "Unable to load coding challenge" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | CodingChallengeEvaluationRequest
      | null;

    const taskId =
      body && typeof body.taskId === "string" ? body.taskId.trim() : "";
    const code = body && typeof body.code === "string" ? body.code : "";

    if (!taskId) {
      return Response.json({ error: "Task id is required" }, { status: 400 });
    }

    if (!code.trim()) {
      return Response.json(
        { error: "Code submission is required" },
        { status: 400 }
      );
    }

    const task = getCodingChallengeTaskById(taskId);
    if (!task) {
      return Response.json(
        { error: "Coding challenge not found" },
        { status: 404 }
      );
    }

    const evaluation = await evaluateCodingChallengeSubmission(task, code);

    return Response.json({ evaluation });
  } catch (error) {
    console.error("[api/interview/coding-challenge]", error);
    return Response.json(
      { error: "Unable to evaluate coding challenge" },
      { status: 500 }
    );
  }
}
