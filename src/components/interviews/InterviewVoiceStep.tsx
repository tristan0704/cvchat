"use client";

import { lazy, Suspense, type ReactNode } from "react";

import { useI18n } from "@/lib/i18n/context";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { formatCountdown } from "@/lib/questionpool";
import { useInterviewSession } from "@/lib/interview-session/context";
import { LAST_MINUTE_THRESHOLD_SECONDS } from "@/lib/voice-interview/session/endgame";
import { useVoiceInterviewController } from "@/lib/voice-interview/session/use-voice-interview-controller";

type VoiceInterviewControllerState = ReturnType<
    typeof useVoiceInterviewController
>;

const FaceLandmarkPanel = lazy(() =>
    import("@/components/interviews/face-landmark-panel").then((module) => ({
        default: module.FaceLandmarkPanel,
    }))
);

type StatusTone = "default" | "positive" | "danger" | "dark";

function StatusPill({
    children,
    tone = "default",
}: {
    children: ReactNode;
    tone?: StatusTone;
}) {
    const toneClasses =
        tone === "positive"
            ? "bg-green-500/10 text-green-300 outline outline-1 outline-green-500/20"
            : tone === "danger"
                ? "bg-red-500/10 text-red-300 outline outline-1 outline-red-500/20"
                : tone === "dark"
                    ? "bg-gray-900 text-white outline outline-1 outline-white/10"
                    : "bg-gray-900 text-gray-300 outline outline-1 outline-white/10";

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${toneClasses}`}
        >
            {children}
        </span>
    );
}

function resolveConnectionMeta(
    connectionStatus: VoiceInterviewControllerState["connectionStatus"],
    labels: AppDictionary["voiceInterview"]
) {
    switch (connectionStatus) {
        case "connected":
            return { label: labels.connected, tone: "positive" as const };
        case "connecting":
            return { label: labels.connecting, tone: "default" as const };
        case "error":
            return { label: labels.error, tone: "danger" as const };
        default:
            return { label: labels.ready, tone: "default" as const };
    }
}

function resolvePhaseMeta(
    callLifecyclePhase: VoiceInterviewControllerState["callLifecyclePhase"],
    labels: AppDictionary["voiceInterview"]
) {
    switch (callLifecyclePhase) {
        case "opening":
            return { label: labels.setup, tone: "default" as const };
        case "interviewing":
            return { label: labels.interviewing, tone: "positive" as const };
        case "closing":
            return { label: labels.closing, tone: "default" as const };
        case "stopping":
            return { label: labels.stopping, tone: "default" as const };
        default:
            return { label: labels.notStarted, tone: "default" as const };
    }
}

function resolveAssistantStatus(
    callLifecyclePhase: VoiceInterviewControllerState["callLifecyclePhase"],
    playbackActive: boolean,
    labels: AppDictionary["voiceInterview"]
) {
    if (playbackActive) return labels.assistantSpeaking;
    if (callLifecyclePhase === "interviewing") return labels.assistantListening;
    if (callLifecyclePhase === "opening") return labels.connectionRunning;
    if (callLifecyclePhase === "closing" || callLifecyclePhase === "stopping") {
        return labels.callEnding;
    }

    return labels.ready;
}

function resolveCallCopy(args: {
    callLifecyclePhase: VoiceInterviewControllerState["callLifecyclePhase"];
    connectionStatus: VoiceInterviewControllerState["connectionStatus"];
    error: string;
    labels: AppDictionary["voiceInterview"];
}) {
    const { callLifecyclePhase, connectionStatus, error, labels } = args;

    if (error) {
        return {
            title: labels.startErrorTitle,
            description: labels.startErrorDescription,
        };
    }

    if (callLifecyclePhase === "opening" || connectionStatus === "connecting") {
        return {
            title: labels.connectingTitle,
            description: labels.connectingDescription,
        };
    }

    if (callLifecyclePhase === "interviewing") {
        return {
            title: labels.runningTitle,
            description: labels.runningDescription,
        };
    }

    if (callLifecyclePhase === "closing" || callLifecyclePhase === "stopping") {
        return {
            title: labels.stoppingTitle,
            description: labels.stoppingDescription,
        };
    }

    return {
        title: labels.readyTitle,
        description: labels.readyDescription,
    };
}

function VoiceInterviewContent({
    role,
    interviewMode,
    controller,
    interviewSessionId,
}: {
    role: string;
    interviewMode: "voice" | "face";
    controller: VoiceInterviewControllerState;
    interviewSessionId: string;
}) {
    const { dictionary } = useI18n();
    const labels = dictionary.voiceInterview;
    const {
        faceLandmarkPanelRef,
        connectionStatus,
        error,
        microphoneSupported,
        recorderSupported,
        callLifecyclePhase,
        secondsLeft,
        playbackActive,
        startCall,
        requestGracefulStop,
    } = controller;

    const connectionMeta = resolveConnectionMeta(connectionStatus, labels);
    const phaseMeta = resolvePhaseMeta(callLifecyclePhase, labels);
    const assistantStatus = resolveAssistantStatus(
        callLifecyclePhase,
        playbackActive,
        labels
    );
    const callCopy = resolveCallCopy({
        callLifecyclePhase,
        connectionStatus,
        error,
        labels,
    });
    const isConnecting =
        callLifecyclePhase === "opening" || connectionStatus === "connecting";
    const canStart =
        callLifecyclePhase === "idle" &&
        connectionStatus !== "connecting" &&
        microphoneSupported &&
        recorderSupported;
    const canStop =
        callLifecyclePhase !== "idle" && callLifecyclePhase !== "stopping";
    const timerTone =
        secondsLeft <= LAST_MINUTE_THRESHOLD_SECONDS ? "danger" : "dark";
    const liveDotTone =
        callLifecyclePhase === "interviewing"
            ? "bg-emerald-400"
            : isConnecting
                ? "bg-amber-400 animate-pulse"
                : callLifecyclePhase === "closing" ||
                    callLifecyclePhase === "stopping"
                    ? "bg-slate-300"
                    : "bg-slate-400";

    return (
        <div className="space-y-4 text-white">
            <header className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                            {labels.liveInterview}
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                            {labels.title}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                            {labels.description} {role}.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                        <StatusPill tone={connectionMeta.tone}>
                            {connectionMeta.label}
                        </StatusPill>
                        <StatusPill tone={phaseMeta.tone}>
                            {phaseMeta.label}
                        </StatusPill>
                        <StatusPill tone={timerTone}>
                            {formatCountdown(secondsLeft)}
                        </StatusPill>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                {interviewMode === "face" ? (
                    <Suspense
                        fallback={
                            <div className="min-h-[360px] rounded-xl bg-gray-900 p-6 text-sm text-gray-400 outline outline-1 outline-white/10">
                                {labels.cameraSetupLoading}
                            </div>
                        }
                    >
                        <FaceLandmarkPanel
                            ref={faceLandmarkPanelRef}
                            role={role}
                            compact
                            minimal
                            title={labels.candidateTitle}
                            description=""
                            showAnalysisSummary={false}
                            analyzeOnStop
                            showLandmarksOverlay={false}
                            videoWidth={720}
                            surface="dark"
                            analysisSessionId={interviewSessionId}
                        />
                    </Suspense>
                ) : (
                    <section className="min-h-[360px] rounded-xl bg-gray-900 p-6 outline outline-1 outline-white/10">
                        <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                            <div className="flex size-24 items-center justify-center rounded-full bg-indigo-500/15 text-3xl font-semibold text-indigo-200 outline outline-1 outline-indigo-400/30">
                                {labels.assistantInitials}
                            </div>
                            <h2 className="mt-6 text-xl font-semibold text-white">
                                {labels.voiceOnlyTitle}
                            </h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-gray-400">
                                {labels.voiceOnlyDescription}
                            </p>
                        </div>
                    </section>
                )}

                <aside className="space-y-4">
                    <section className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                        <div className="rounded-xl bg-gray-900 p-5 outline outline-1 outline-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`size-2.5 rounded-full ${liveDotTone}`}
                                    />
                                    <p className="text-sm font-semibold">
                                        {callCopy.title}
                                    </p>
                                </div>

                                <span className="rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 outline outline-1 outline-white/10">
                                    {assistantStatus}
                                </span>
                            </div>

                            <p className="mt-4 text-3xl font-semibold tracking-tight">
                                {formatCountdown(secondsLeft)}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-300">
                                {callCopy.description}
                            </p>
                        </div>

                        <div className="mt-4 rounded-xl bg-gray-900 p-4 outline outline-1 outline-white/10">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                                {labels.role}
                            </p>
                            <p className="mt-2 text-base font-semibold text-white">
                                {role}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                                {labels.separateFeedbackStep}
                            </p>
                        </div>

                        {error ? (
                            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        ) : null}

                        {!microphoneSupported ? (
                            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                                {labels.microphoneUnsupported}
                            </div>
                        ) : null}

                        {microphoneSupported && !recorderSupported ? (
                            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                                {labels.recorderUnsupported}
                            </div>
                        ) : null}

                        <div className="mt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => void startCall()}
                                disabled={!canStart}
                                className="flex-1 rounded-md bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isConnecting ? labels.connecting : labels.startCall}
                            </button>

                            <button
                                type="button"
                                onClick={() => void requestGracefulStop("manual")}
                                disabled={!canStop}
                                className="rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-gray-200 outline outline-1 outline-white/10 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {labels.stopCall}
                            </button>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}

export default function InterviewVoiceStep() {
    const session = useInterviewSession();

    return (
        <VoiceInterviewContent
            role={session.role}
            interviewMode={session.interviewMode}
            controller={session.voiceInterview}
            interviewSessionId={session.interviewId}
        />
    );
}
