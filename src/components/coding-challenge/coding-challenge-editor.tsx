"use client";

import {
  CodingChallengeErrorState,
  CodingChallengeHeader,
  CodingChallengeLoadingState,
  CodingChallengeSidebar,
  CodingChallengeSubmitState,
  CodingChallengeWorkspace,
} from "@/components/coding-challenge/coding-challenge-editor-sections";
import { useCodingChallengeSubmission } from "@/lib/coding-challenge/use-coding-challenge-submission";
import { useCodingChallengeTask } from "@/lib/coding-challenge/use-coding-challenge-task";
import { useInterviewSession } from "@/lib/interview-session/context";
import type { CodingChallengeRuntimeStatusSnapshot } from "@/lib/coding-challenge/types";

export default function CodingChallengeEditor({
  onStatusUpdate,
}: {
  onStatusUpdate?: (status: CodingChallengeRuntimeStatusSnapshot) => void;
}) {
  const session = useInterviewSession();
  const interviewId = session.interviewId;
  const roleLabel = session.role;
  const {
    draft,
    error,
    isLoading,
    isRefreshing,
    loadNewTask,
    resetCode,
    updateCode,
  } = useCodingChallengeTask({
    interviewId,
    onStatusUpdate,
    roleLabel,
  });
  const { evaluation, isSubmitting, submitError, submitSolution } =
    useCodingChallengeSubmission({
      interviewId,
      initialEvaluation: draft?.evaluation ?? null,
      onStatusUpdate,
    });

  const lineCount = draft ? draft.code.split("\n").length : 0;
  const characterCount = draft?.code.length ?? 0;

  if (isLoading && !draft) {
    return <CodingChallengeLoadingState />;
  }

  if (!draft) {
    return (
      <CodingChallengeErrorState
        message={error || "Keine Coding-Challenge verfügbar."}
      />
    );
  }

  const { task } = draft;
  const currentCode = draft.code;
  const hasSubmittedCurrentTask =
    evaluation?.taskId === task.id && evaluation?.attemptId === draft.attemptId;

  async function handleSubmitSolution() {
    if (!draft) {
      return;
    }

    await submitSolution({
      attemptId: draft.attemptId,
      code: currentCode,
    });
  }

  return (
    <div className="space-y-6">
      <CodingChallengeHeader
        task={task}
        isRefreshing={isRefreshing}
        isSubmitting={isSubmitting}
        onNewTask={loadNewTask}
        onResetCode={resetCode}
        onSubmit={handleSubmitSolution}
      />

      {error ? (
        <CodingChallengeErrorState message={error} />
      ) : null}

      {submitError ? (
        <CodingChallengeSubmitState message={submitError} tone="error" />
      ) : null}

      {!submitError && isSubmitting ? (
        <CodingChallengeSubmitState
          message="Lösung wird zur Bewertung eingereicht..."
        />
      ) : null}

      {!submitError && !isSubmitting && hasSubmittedCurrentTask ? (
        <CodingChallengeSubmitState
          message="Lösung eingereicht. Die GPT-Bewertung wurde für den nächsten Schritt gespeichert."
          tone="success"
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <CodingChallengeSidebar task={task} />
        <CodingChallengeWorkspace
          language={task.language}
          code={currentCode}
          lineCount={lineCount}
          characterCount={characterCount}
          onCodeChange={updateCode}
        />
      </div>
    </div>
  );
}
