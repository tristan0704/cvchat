import type { ReactNode } from "react";
import Editor from "@monaco-editor/react";

import {
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
} from "@/lib/coding-challenge/labels";
import type {
  PublicCodingChallengeTask,
  CodingChallengeLanguage,
} from "@/lib/coding-challenge/types";

function TaskPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-gray-900 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
        {title}
      </p>
      {children}
    </section>
  );
}

export function CodingChallengeLoadingState() {
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900 p-6 text-sm text-gray-300">
      Coding-Challenge wird geladen...
    </div>
  );
}

export function CodingChallengeErrorState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
      {message}
    </div>
  );
}

export function CodingChallengeSubmitState({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "error" | "success";
}) {
  const toneClassName =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : tone === "success"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
        : "border-white/10 bg-gray-900 text-gray-300";

  return (
    <div className={`rounded-xl border p-4 text-sm ${toneClassName}`}>
      {message}
    </div>
  );
}

export function CodingChallengeHeader({
  task,
  isRefreshing,
  isSubmitting,
  onNewTask,
  onResetCode,
  onSubmit,
}: {
  task: PublicCodingChallengeTask;
  isRefreshing: boolean;
  isSubmitting: boolean;
  onNewTask: () => void;
  onResetCode: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-gray-900 p-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
          <span>{task.role}</span>
          <span>{DIFFICULTY_LABELS[task.difficulty]}</span>
          <span>{LANGUAGE_LABELS[task.language]}</span>
          <span>{task.estimatedMinutes} min</span>
        </div>

        <h2 className="text-xl font-semibold text-white">{task.name}</h2>
        <p className="max-w-3xl text-sm text-gray-300">{task.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onNewTask}
          disabled={isRefreshing}
          className="rounded-md border border-white/15 px-3 py-2 text-sm text-white transition hover:bg-white/5 disabled:opacity-50"
        >
          {isRefreshing ? "Lade..." : "Neue Aufgabe"}
        </button>
        <button
          type="button"
          onClick={onResetCode}
          className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Code zurücksetzen
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {isSubmitting ? "Sende..." : "Lösung einreichen"}
        </button>
      </div>
    </div>
  );
}

export function CodingChallengeSidebar({
  task,
}: {
  task: PublicCodingChallengeTask;
}) {
  return (
    <aside className="space-y-4">
      <TaskPanel title="Aufgabe">
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-200">
          {task.statement}
        </p>
      </TaskPanel>

      <TaskPanel title="Anforderungen">
        <ul className="mt-3 space-y-2 text-sm text-gray-200">
          {task.requirements.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ul>
      </TaskPanel>

      {task.examples.length > 0 ? (
        <TaskPanel title="Beispiele">
          <ul className="mt-3 space-y-2 text-sm text-gray-200">
            {task.examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </TaskPanel>
      ) : null}
    </aside>
  );
}

export function CodingChallengeWorkspace({
  language,
  code,
  lineCount,
  characterCount,
  onCodeChange,
}: {
  language: CodingChallengeLanguage;
  code: string;
  lineCount: number;
  characterCount: number;
  onCodeChange: (value: string | undefined) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-gray-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gray-900 px-4 py-3 text-xs text-gray-300">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-white">
            {LANGUAGE_LABELS[language]}
          </span>
          <span>{lineCount} Zeilen</span>
          <span>{characterCount} Zeichen</span>
        </div>

        <div className="rounded-full border border-white/10 px-3 py-1">
          Monaco-Editor
        </div>
      </div>

      <div className="h-[560px]">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={onCodeChange}
          options={{
            automaticLayout: true,
            fontFamily: "JetBrains Mono, Consolas, monospace",
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            tabSize: 4,
            wordWrap: "on",
          }}
        />
      </div>
    </section>
  );
}
