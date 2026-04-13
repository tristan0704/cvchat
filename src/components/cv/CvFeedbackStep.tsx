"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import CvAnalysisDashboard from "@/components/cv/CvAnalysisDashboard";
import CvRoleMatchCard from "@/components/cv/CvRoleMatchCard";
import CvScoreBreakdownCard from "@/components/cv/CvScoreBreakdownCard";
import { loadCvFeedbackResult, persistCvFeedbackResult } from "@/components/cv/storage";
import type { CvFeedbackResult, InterviewCvConfig } from "@/components/cv/types";
import { useOptionalInterviewSession } from "@/components/interviews/interview-session-context";

const MAX_FILE_BYTES = 20_000_000;

function buildConfigBadges(config: InterviewCvConfig) {
  return [
    config.role,
    config.experience,
    config.companySize,
    config.interviewType,
  ].filter((value) => value.trim().length > 0);
}

export default function CvFeedbackStep() {
  const session = useOptionalInterviewSession();
  const config = session?.config ?? {
    role: "Backend Developer",
    experience: "",
    companySize: "",
    interviewType: "",
  };

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CvFeedbackResult | null>(null);

  useEffect(() => {
    setResult(loadCvFeedbackResult(config));
    setFile(null);
    setError("");
  }, [
    config.companySize,
    config.experience,
    config.interviewType,
    config.role,
  ]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.type !== "application/pdf") {
      setError("Please upload a PDF");
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_BYTES) {
      setError("File too large");
      setFile(null);
      return;
    }

    setError("");
    setFile(selected);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Please upload a PDF");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", config.role);
    formData.append("experience", config.experience);
    formData.append("companySize", config.companySize);
    formData.append("interviewType", config.interviewType);

    try {
      const response = await fetch("/api/interview/cv-feedback", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as CvFeedbackResult | { error?: string };
      if (!response.ok || !("quality" in data) || !("roleAnalysis" in data)) {
        throw new Error(("error" in data && data.error) || "Analysis failed");
      }

      setResult(data);
      persistCvFeedbackResult(config, data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Analysis failed"
      );
    } finally {
      setLoading(false);
    }
  }

  const badges = buildConfigBadges(config);

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">CV Feedback</h2>
            <p className="mt-1 text-sm text-slate-600">
              Analyse fuer die ausgewaehlte Interview-Konfiguration.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-slate-700"
              htmlFor="cv-feedback-upload"
            >
              CV (PDF)
            </label>
            <input
              id="cv-feedback-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white"
            />
            {file ? (
              <p className="text-xs text-slate-500">{file.name}</p>
            ) : result?.fileName ? (
              <p className="text-xs text-slate-500">
                Letzte Analyse: {result.fileName}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Analysiere..." : "CV analysieren"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>

      {loading ? (
        <div className="rounded-[24px] border bg-white p-10 text-center text-sm text-slate-500">
          CV wird analysiert...
        </div>
      ) : null}

      {!loading && result ? (
        <div className="space-y-6">
          <CvScoreBreakdownCard breakdown={result.scoreBreakdown} />
          <CvAnalysisDashboard data={result.quality} />
          <CvRoleMatchCard analysis={result.roleAnalysis} />
        </div>
      ) : null}

      {!loading && !result ? (
        <div className="rounded-[24px] border border-dashed bg-white p-10 text-center text-sm text-slate-500">
          Lade deinen CV hoch, um ein rollenbezogenes Feedback zu sehen.
        </div>
      ) : null}
    </div>
  );
}
