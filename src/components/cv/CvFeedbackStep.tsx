"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CvAnalysisDashboard from "@/components/cv/CvAnalysisDashboard";
import CvRoleMatchCard from "@/components/cv/CvRoleMatchCard";
import CvScoreBreakdownCard from "@/components/cv/CvScoreBreakdownCard";
import { loadCvFeedbackResult, persistCvFeedbackResult } from "@/lib/cv/storage";
import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";
import { useOptionalInterviewSession } from "@/lib/interview-session/context";
import {
  buildStoredProfileCvFingerprint,
  loadStoredProfileCv,
  type StoredProfileCvRecord,
} from "@/lib/profile-cv-storage";

function buildConfigBadges(config: InterviewCvConfig) {
  return [
    config.role,
    config.experience,
    config.companySize,
    config.interviewType,
  ].filter((value) => value.trim().length > 0);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function requestCvFeedback(
  storedCv: StoredProfileCvRecord,
  config: InterviewCvConfig
) {
  const formData = new FormData();
  formData.append("file", storedCv.file, storedCv.name);
  formData.append("role", config.role);
  formData.append("experience", config.experience);
  formData.append("companySize", config.companySize);
  formData.append("interviewType", config.interviewType);

  const response = await fetch("/api/interview/cv-feedback", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as CvFeedbackResult | { error?: string };
  if (!response.ok || !("quality" in data) || !("roleAnalysis" in data)) {
    throw new Error(
      ("error" in data && data.error) || "CV-Analyse konnte nicht erstellt werden."
    );
  }

  return data;
}

export default function CvFeedbackStep() {
  const session = useOptionalInterviewSession();
  const config = session?.config ?? {
    role: "Backend Developer",
    experience: "",
    companySize: "",
    interviewType: "",
  };
  const { role, experience, companySize, interviewType } = config;

  const [storedCv, setStoredCv] = useState<StoredProfileCvRecord | null>(null);
  const [loadingStoredCv, setLoadingStoredCv] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CvFeedbackResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateStep() {
      setLoadingStoredCv(true);
      setLoading(false);
      setError("");
      setResult(null);

      try {
        const nextStoredCv = await loadStoredProfileCv();

        if (cancelled) return;

        setStoredCv(nextStoredCv);

        if (!nextStoredCv) {
          return;
        }

        const cvFingerprint = buildStoredProfileCvFingerprint(nextStoredCv);
        const currentConfig: InterviewCvConfig = {
          role,
          experience,
          companySize,
          interviewType,
        };
        const cachedResult = loadCvFeedbackResult(currentConfig, cvFingerprint);

        if (cancelled) return;

        if (cachedResult) {
          setResult(cachedResult);
          return;
        }

        setLoading(true);
        const nextResult = await requestCvFeedback(nextStoredCv, currentConfig);

        if (cancelled) return;

        setResult(nextResult);
        persistCvFeedbackResult(currentConfig, cvFingerprint, nextResult);
      } catch (storageError) {
        if (cancelled) return;

        setError(
          getErrorMessage(
            storageError,
            "Gespeicherter Lebenslauf konnte nicht geladen werden."
          )
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingStoredCv(false);
        }
      }
    }

    void hydrateStep();

    return () => {
      cancelled = true;
    };
  }, [
    companySize,
    experience,
    interviewType,
    role,
  ]);

  async function handleRefreshFeedback() {
    if (!storedCv) {
      setError("Kein gespeicherter Lebenslauf gefunden.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const currentConfig: InterviewCvConfig = {
        role,
        experience,
        companySize,
        interviewType,
      };
      const data = await requestCvFeedback(storedCv, currentConfig);
      const cvFingerprint = buildStoredProfileCvFingerprint(storedCv);

      setResult(data);
      persistCvFeedbackResult(currentConfig, cvFingerprint, data);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "CV-Analyse konnte nicht erstellt werden."
        )
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

        <div className="mt-6 rounded-[24px] border bg-slate-50 p-4">
          {loadingStoredCv ? (
            <p className="text-sm text-slate-500">
              Gespeicherter Lebenslauf wird geladen...
            </p>
          ) : storedCv ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {storedCv.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Im Profil gespeichert am {formatDateTime(storedCv.uploadedAt)}
                </p>
                {result?.analyzedAt ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Letzte Analyse: {formatDateTime(result.analyzedAt)}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void handleRefreshFeedback()}
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading
                  ? "Analysiere..."
                  : result
                    ? "Feedback aktualisieren"
                    : "Feedback starten"}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Kein Lebenslauf im Profil hinterlegt
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Lade deinen CV zuerst im Profil hoch. Danach wird er hier pro
                  Interview-Konfiguration automatisch analysiert.
                </p>
              </div>

              <Link
                href="/profile"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
              >
                Zum Profil
              </Link>
            </div>
          )}
        </div>

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
          Hinterlege deinen Lebenslauf im Profil, um hier ein rollenbezogenes
          Feedback zu sehen.
        </div>
      ) : null}
    </div>
  );
}
