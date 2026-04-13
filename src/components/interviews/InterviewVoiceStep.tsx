"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { useOptionalInterviewSession } from "@/components/interviews/interview-session-context";
import { FaceLandmarkPanel } from "@/components/interviews/face-landmark-panel";
import { InterviewFeedbackPanel } from "@/components/interviews/InterviewFeedback";
import { formatCountdown } from "@/lib/interview";
import { LAST_MINUTE_THRESHOLD_SECONDS } from "@/lib/voice-interview/session/endgame";
import { useVoiceInterviewController } from "@/lib/voice-interview/session/use-voice-interview-controller";

//TODO: anständige Session Storage bauen bzw bevor DB kommt alles sauber überprüfen


type VoiceInterviewControllerState = ReturnType<
  typeof useVoiceInterviewController
>;

function VoiceInterviewContent({
  role,
  controller,
}: {
  role: string;
  controller: VoiceInterviewControllerState;
}) {
  const {
    faceLandmarkPanelRef,
    connectionStatus,
    error,
    microphoneSupported,
    recorderSupported,
    interviewRecapUrl,
    interviewRecapStatus,
    interviewRecapError,
    interviewRecapCaptureNote,
    callLifecyclePhase,
    secondsLeft,
    playbackActive,
    postCallCandidateTranscript,
    postCallTranscriptStatus,
    postCallTranscriptError,
    canExportTranscript,
    interviewTimingMetrics,
    hasTimingMetrics,
    startCall,
    requestGracefulStop,
    exportTranscriptAsTxt,
  } = controller;

  return (
    <div className="text-slate-900">
      <div className="space-y-4">
        <header className="rounded-[24px] border bg-white p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Isolated Flow
            </p>
            <h1 className="text-xl font-semibold">Live Voice + Video</h1>
            <p className="mt-1 text-sm text-slate-600">Aktive Rolle: {role}</p>
          </div>
        </header>

        <FaceLandmarkPanel
          ref={faceLandmarkPanelRef}
          role={role}
          compact
          minimal
          title="Face Cam"
          description=""
        />

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-[24px] border bg-white p-4">
            <p className="text-sm font-medium text-slate-500">{role}</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Call</h2>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border bg-slate-50 px-3 py-1.5">
                {connectionStatus}
              </span>
              <span className="rounded-full border bg-slate-50 px-3 py-1.5">
                {callLifecyclePhase}
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 ${
                  secondsLeft <= LAST_MINUTE_THRESHOLD_SECONDS
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-50 text-slate-700"
                }`}
              >
                {formatCountdown(secondsLeft)}
              </span>
              <span className="rounded-full border bg-slate-50 px-3 py-1.5">
                {playbackActive ? "AI spricht" : "wartet"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span
                className={`rounded-full border px-3 py-1.5 ${
                  microphoneSupported
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                Mic
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 ${
                  recorderSupported
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                Recorder
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void startCall()}
                disabled={
                  callLifecyclePhase !== "idle" ||
                  connectionStatus === "connecting" ||
                  !microphoneSupported ||
                  !recorderSupported
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {callLifecyclePhase === "opening" ||
                connectionStatus === "connecting"
                  ? "Verbinde..."
                  : "Start"}
              </button>
              <button
                onClick={() => void requestGracefulStop("manual")}
                disabled={
                  callLifecyclePhase === "idle" ||
                  callLifecyclePhase === "stopping"
                }
                className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Stop
              </button>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {!microphoneSupported ? (
              <p className="mt-4 text-xs text-slate-500">
                Nur mit HTTPS oder localhost und Mikrofonfreigabe.
              </p>
            ) : null}
          </section>

          <InterviewFeedbackPanel
            callLifecyclePhase={callLifecyclePhase}
            interviewRecapUrl={interviewRecapUrl}
            interviewRecapStatus={interviewRecapStatus}
            interviewRecapError={interviewRecapError}
            interviewRecapCaptureNote={interviewRecapCaptureNote}
            postCallCandidateTranscript={postCallCandidateTranscript}
            postCallTranscriptStatus={postCallTranscriptStatus}
            postCallTranscriptError={postCallTranscriptError}
            canExportTranscript={canExportTranscript}
            interviewTimingMetrics={interviewTimingMetrics}
            hasTimingMetrics={hasTimingMetrics}
            exportTranscriptAsTxt={exportTranscriptAsTxt}
          />
        </div>
      </div>
    </div>
  );
}

function StandaloneInterviewVoiceStepContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "Backend Developer";
  const controller = useVoiceInterviewController(role);

  return <VoiceInterviewContent key={role} role={role} controller={controller} />;
}

export default function InterviewVoiceStep() {
  const session = useOptionalInterviewSession();
  const controller = session?.voiceInterview;

  if (controller) {
    return <VoiceInterviewContent role={session.role} controller={controller} />;
  }

  return (
    <Suspense fallback={<div className="min-h-[320px] rounded-xl bg-slate-50" />}>
      <StandaloneInterviewVoiceStepContent />
    </Suspense>
  );
}
