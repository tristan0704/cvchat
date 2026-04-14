"use client";

import { Suspense, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { useOptionalInterviewSession } from "@/components/interviews/interview-session-context";
import { getInterviewSessionId } from "@/components/interviews/interview-session-id";
import { FaceLandmarkPanel } from "@/components/interviews/face-landmark-panel";
import { formatCountdown } from "@/lib/interview";
import { LAST_MINUTE_THRESHOLD_SECONDS } from "@/lib/voice-interview/session/endgame";
import { useVoiceInterviewController } from "@/lib/voice-interview/session/use-voice-interview-controller";

type VoiceInterviewControllerState = ReturnType<
    typeof useVoiceInterviewController
>;

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
    connectionStatus: VoiceInterviewControllerState["connectionStatus"]
) {
    switch (connectionStatus) {
        case "connected":
            return { label: "Verbunden", tone: "positive" as const };
        case "connecting":
            return { label: "Verbinde...", tone: "default" as const };
        case "error":
            return { label: "Fehler", tone: "danger" as const };
        default:
            return { label: "Bereit", tone: "default" as const };
    }
}

function resolvePhaseMeta(
    callLifecyclePhase: VoiceInterviewControllerState["callLifecyclePhase"]
) {
    switch (callLifecyclePhase) {
        case "opening":
            return { label: "Setup", tone: "default" as const };
        case "interviewing":
            return { label: "Im Gespraech", tone: "positive" as const };
        case "closing":
            return { label: "Letzte Antwort", tone: "default" as const };
        case "stopping":
            return { label: "Beende Call", tone: "default" as const };
        default:
            return { label: "Noch nicht gestartet", tone: "default" as const };
    }
}

function resolveAssistantStatus(
    callLifecyclePhase: VoiceInterviewControllerState["callLifecyclePhase"],
    playbackActive: boolean
) {
    if (playbackActive) return "AI spricht";
    if (callLifecyclePhase === "interviewing") return "AI hoert zu";
    if (callLifecyclePhase === "opening") return "Verbindung laeuft";
    if (callLifecyclePhase === "closing" || callLifecyclePhase === "stopping") {
        return "Call endet";
    }

    return "Bereit";
}

function resolveCallCopy(args: {
    callLifecyclePhase: VoiceInterviewControllerState["callLifecyclePhase"];
    connectionStatus: VoiceInterviewControllerState["connectionStatus"];
    error: string;
}) {
    const { callLifecyclePhase, connectionStatus, error } = args;

    if (error) {
        return {
            title: "Call konnte nicht sauber gestartet werden",
            description: "Pruefe Mikrofonfreigabe und Browser-Support, dann starte erneut.",
        };
    }

    if (callLifecyclePhase === "opening" || connectionStatus === "connecting") {
        return {
            title: "Verbindung wird aufgebaut",
            description: "Mikrofon, Session und AI-Interviewer werden gerade vorbereitet.",
        };
    }

    if (callLifecyclePhase === "interviewing") {
        return {
            title: "Interview laeuft",
            description: "Fokussiere dich auf das Gespraech. Alles fuer Feedback kommt im naechsten Schritt.",
        };
    }

    if (callLifecyclePhase === "closing" || callLifecyclePhase === "stopping") {
        return {
            title: "Call wird beendet",
            description: "Die laufende Session wird kontrolliert geschlossen.",
        };
    }

    return {
        title: "Bereit fuer den Live-Call",
        description: "Starte das Interview, sobald Mikrofon und Kamera bereit sind.",
    };
}

function VoiceInterviewContent({
    role,
    controller,
    interviewSessionId,
}: {
    role: string;
    controller: VoiceInterviewControllerState;
    interviewSessionId: string;
}) {
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

    const connectionMeta = resolveConnectionMeta(connectionStatus);
    const phaseMeta = resolvePhaseMeta(callLifecyclePhase);
    const assistantStatus = resolveAssistantStatus(
        callLifecyclePhase,
        playbackActive
    );
    const callCopy = resolveCallCopy({
        callLifecyclePhase,
        connectionStatus,
        error,
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
                            Live Interview
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                            Voice Call
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                            Reduzierte Live-Ansicht fuer den laufenden Call mit{" "}
                            {role}.
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
                <FaceLandmarkPanel
                    ref={faceLandmarkPanelRef}
                    role={role}
                    compact
                    minimal
                    title="Du"
                    description=""
                    showAnalysisSummary={false}
                    analyzeOnStop
                    showLandmarksOverlay={false}
                    videoWidth={720}
                    surface="dark"
                    analysisSessionId={interviewSessionId}
                />

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
                                Rolle
                            </p>
                            <p className="mt-2 text-base font-semibold text-white">
                                {role}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                                Transcript, Recap und weitere Auswertung bleiben
                                bewusst im separaten Feedback-Schritt.
                            </p>
                        </div>

                        {error ? (
                            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        ) : null}

                        {!microphoneSupported ? (
                            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                                Mikrofon funktioniert nur mit HTTPS oder
                                localhost und aktiver Freigabe.
                            </div>
                        ) : null}

                        {microphoneSupported && !recorderSupported ? (
                            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                                Dieser Browser unterstuetzt die benoetigte
                                Aufnahme-Konfiguration nicht.
                            </div>
                        ) : null}

                        <div className="mt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => void startCall()}
                                disabled={!canStart}
                                className="flex-1 rounded-md bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isConnecting ? "Verbinde..." : "Call starten"}
                            </button>

                            <button
                                type="button"
                                onClick={() => void requestGracefulStop("manual")}
                                disabled={!canStop}
                                className="rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-gray-200 outline outline-1 outline-white/10 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Beenden
                            </button>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function StandaloneInterviewVoiceStepContent() {
    const searchParams = useSearchParams();
    const role = searchParams.get("role") ?? "Backend Developer";
    const controller = useVoiceInterviewController(role);
    const params = useParams<{ id?: string }>();
    const interviewSessionId = getInterviewSessionId(params?.id);

    return (
        <VoiceInterviewContent
            key={role}
            role={role}
            controller={controller}
            interviewSessionId={interviewSessionId}
        />
    );
}

export default function InterviewVoiceStep() {
    const session = useOptionalInterviewSession();
    const controller = session?.voiceInterview;
    const params = useParams<{ id?: string }>();
    const interviewSessionId = getInterviewSessionId(params?.id);

    if (controller) {
        return (
            <VoiceInterviewContent
                role={session.role}
                controller={controller}
                interviewSessionId={interviewSessionId}
            />
        );
    }

    return (
        <Suspense fallback={<div className="min-h-[320px] rounded-xl bg-gray-800/50 outline outline-1 outline-white/10" />}>
            <StandaloneInterviewVoiceStepContent />
        </Suspense>
    );
}
