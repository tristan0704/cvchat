"use client";

import { useOptionalInterviewSession } from "@/components/interviews/interview-session-context";
import { formatCountdown } from "@/lib/interview";
import type { PostCallTranscriptStatus } from "@/lib/interview-transcript";
import {
  formatMetricSeconds,
  formatMetricWordsPerMinute,
} from "@/lib/voice-interview/core/formatters";
import type {
  CallLifecyclePhase,
  InterviewRecapStatus,
  InterviewTimingMetrics,
} from "@/lib/voice-interview/core/types";

export type InterviewFeedbackProps = {
  callLifecyclePhase: CallLifecyclePhase;
  interviewRecapUrl: string;
  interviewRecapStatus: InterviewRecapStatus;
  interviewRecapError: string;
  interviewRecapCaptureNote: string;
  postCallCandidateTranscript: string;
  postCallTranscriptStatus: PostCallTranscriptStatus;
  postCallTranscriptError: string;
  canExportTranscript: boolean;
  interviewTimingMetrics: InterviewTimingMetrics;
  hasTimingMetrics: boolean;
  exportTranscriptAsTxt: () => void;
};

export function InterviewFeedbackPanel({
  callLifecyclePhase,
  interviewRecapUrl,
  interviewRecapStatus,
  interviewRecapError,
  interviewRecapCaptureNote,
  postCallCandidateTranscript,
  postCallTranscriptStatus,
  postCallTranscriptError,
  canExportTranscript,
  interviewTimingMetrics,
  hasTimingMetrics,
  exportTranscriptAsTxt,
}: InterviewFeedbackProps) {
  return (
    <section className="rounded-[24px] border bg-white p-4">
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Transkript & Recap</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            {postCallTranscriptStatus}
          </span>
          <button
            type="button"
            onClick={exportTranscriptAsTxt}
            disabled={!canExportTranscript}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            TXT Export
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <div className="rounded-[20px] border bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-900">
              Aufnahme-Transkript
            </p>
            <span className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-600">
              {postCallTranscriptStatus}
            </span>
          </div>

          <div className="mt-4">
            {postCallCandidateTranscript ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
                {postCallCandidateTranscript}
              </p>
            ) : postCallTranscriptStatus === "transcribing" ? (
              <p className="text-sm text-slate-600">
                Aufnahme wird gerade transkribiert.
              </p>
            ) : postCallTranscriptStatus === "recording" ? (
              <p className="text-sm text-slate-600">
                Call laeuft. Das Transkript wird nach dem Beenden aus dem
                MediaRecorder erzeugt.
              </p>
            ) : postCallTranscriptStatus === "error" ? (
              <p className="text-sm text-red-600">
                {postCallTranscriptError ||
                  "Das Aufnahme-Transkript konnte nicht erstellt werden."}
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                Nach dem Call erscheint hier das Aufnahme-Transkript des
                Kandidaten.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[20px] border bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Gesamtes Interview
                </p>
                <p className="text-xs text-slate-500">
                  KI + Kandidat in einer Aufnahme
                </p>
              </div>
              <span className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-600">
                {interviewRecapStatus}
              </span>
            </div>

            <div className="mt-4">
              {interviewRecapUrl ? (
                <div className="space-y-3">
                  <audio
                    controls
                    preload="metadata"
                    src={interviewRecapUrl}
                    className="w-full"
                  >
                    Dein Browser unterstuetzt das Audio-Element nicht.
                  </audio>
                  <p className="text-xs text-slate-500">
                    Der Recap mischt die Interviewer- und Kandidatenstimme in
                    eine gemeinsame Datei.
                  </p>
                </div>
              ) : interviewRecapStatus === "recording" ? (
                <p className="text-sm text-slate-600">
                  Das komplette Interview wird parallel mitgeschnitten und steht
                  nach dem Beenden hier bereit.
                </p>
              ) : interviewRecapStatus === "error" ? (
                <p className="text-sm text-red-600">
                  {interviewRecapError ||
                    "Der Interview-Recap konnte nicht erstellt werden."}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Nach dem Call kannst du hier das gesamte Interview abspielen.
                </p>
              )}

              {interviewRecapCaptureNote ? (
                <p className="mt-3 text-xs text-amber-700">
                  {interviewRecapCaptureNote}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[20px] border bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Timing-Analyse
                </p>
                <p className="text-xs text-slate-500">
                  Nur Metriken, die im Transkript nicht direkt sichtbar sind
                </p>
              </div>
              <span className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-600">
                {hasTimingMetrics
                  ? `${interviewTimingMetrics.answerCount} Antworten`
                  : "noch leer"}
              </span>
            </div>

            <div className="mt-4">
              {hasTimingMetrics ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-3">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Gesamte Sprechzeit
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {formatCountdown(
                        Math.max(
                          0,
                          Math.round(
                            interviewTimingMetrics.totalCandidateSpeechMs / 1_000
                          )
                        )
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border bg-white p-3">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Words per Minute
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {formatMetricWordsPerMinute(
                        interviewTimingMetrics.candidateWordsPerMinute
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border bg-white p-3">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Durchschn. Antwortdauer
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {formatMetricSeconds(
                        interviewTimingMetrics.averageAnswerDurationMs
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border bg-white p-3">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Laengste Antwort
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {formatMetricSeconds(
                        interviewTimingMetrics.longestAnswerDurationMs
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border bg-white p-3">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Kuerzeste Antwort
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {formatMetricSeconds(
                        interviewTimingMetrics.shortestAnswerDurationMs
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border bg-white p-3">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Durchschn. Reaktionszeit
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {formatMetricSeconds(
                        interviewTimingMetrics.averageResponseLatencyMs
                      )}
                    </dd>
                  </div>
                  <div className="rounded-2xl border bg-white p-3 sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Laengste Denkpause vor einer Antwort
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {formatMetricSeconds(
                        interviewTimingMetrics.longestResponseLatencyMs
                      )}
                    </dd>
                  </div>
                </dl>
              ) : callLifecyclePhase === "interviewing" ? (
                <p className="text-sm text-slate-600">
                  Sobald der Kandidat auf eine Frage antwortet, erscheinen hier
                  Antwortdauer, Reaktionszeit und Sprechtempo.
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Nach dem ersten beantworteten Interviewturn erscheinen hier
                  reine Timing-Metriken.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function InterviewFeedback() {
  const session = useOptionalInterviewSession();
  const controller = session?.voiceInterview;

  if (!controller) {
    return null;
  }

  return (
    <InterviewFeedbackPanel
      callLifecyclePhase={controller.callLifecyclePhase}
      interviewRecapUrl={controller.interviewRecapUrl}
      interviewRecapStatus={controller.interviewRecapStatus}
      interviewRecapError={controller.interviewRecapError}
      interviewRecapCaptureNote={controller.interviewRecapCaptureNote}
      postCallCandidateTranscript={controller.postCallCandidateTranscript}
      postCallTranscriptStatus={controller.postCallTranscriptStatus}
      postCallTranscriptError={controller.postCallTranscriptError}
      canExportTranscript={controller.canExportTranscript}
      interviewTimingMetrics={controller.interviewTimingMetrics}
      hasTimingMetrics={controller.hasTimingMetrics}
      exportTranscriptAsTxt={controller.exportTranscriptAsTxt}
    />
  );
}
