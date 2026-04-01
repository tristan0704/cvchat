"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { FaceLandmarkPanel } from "@/components/interview/face-landmark-panel"
import { formatCountdown } from "@/lib/interview"
import { formatMetricSeconds, formatMetricWordsPerMinute } from "@/lib/voice-interview/core/formatters"
import { LAST_MINUTE_THRESHOLD_SECONDS } from "@/lib/voice-interview/session/endgame"
import { useVoiceInterviewController } from "@/lib/voice-interview/session/use-voice-interview-controller"

function VoiceInterview({ role }: { role: string }) {
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
    } = useVoiceInterviewController(role)

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                <header className="mb-4 rounded-[24px] border bg-white p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Isolated Flow</p>
                        <h1 className="text-xl font-semibold">Live Voice + Video</h1>
                        <p className="mt-1 text-sm text-slate-600">Aktive Rolle: {role}</p>
                    </div>
                </header>

                <div className="space-y-4">
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
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{connectionStatus}</span>
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{callLifecyclePhase}</span>
                                <span className={`rounded-full border px-3 py-1.5 ${secondsLeft <= LAST_MINUTE_THRESHOLD_SECONDS ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700"}`}>
                                    {formatCountdown(secondsLeft)}
                                </span>
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{playbackActive ? "AI spricht" : "wartet"}</span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                                <span className={`rounded-full border px-3 py-1.5 ${microphoneSupported ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                    Mic
                                </span>
                                <span className={`rounded-full border px-3 py-1.5 ${recorderSupported ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                    Recorder
                                </span>
                                <span className="rounded-full border bg-slate-50 px-3 py-1.5">{postCallTranscriptStatus}</span>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => void startCall()}
                                    disabled={callLifecyclePhase !== "idle" || connectionStatus === "connecting" || !microphoneSupported || !recorderSupported}
                                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {callLifecyclePhase === "opening" || connectionStatus === "connecting" ? "Verbinde..." : "Start"}
                                </button>
                                <button
                                    onClick={() => void requestGracefulStop("manual")}
                                    disabled={callLifecyclePhase === "idle" || callLifecyclePhase === "stopping"}
                                    className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                                >
                                    Stop
                                </button>
                            </div>

                            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
                            {postCallTranscriptError ? <p className="mt-2 text-sm text-red-600">{postCallTranscriptError}</p> : null}
                            {!microphoneSupported ? <p className="mt-4 text-xs text-slate-500">Nur mit HTTPS oder localhost und Mikrofonfreigabe.</p> : null}
                        </section>

                        <section className="rounded-[24px] border bg-white p-4">
                            <div className="flex items-center justify-between gap-3 border-b pb-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Transkript & Recap</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full border bg-slate-50 px-3 py-1.5 text-xs text-slate-600">{postCallTranscriptStatus}</span>
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
                                        <p className="text-sm font-medium text-slate-900">Aufnahme-Transkript</p>
                                        <span className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-600">{postCallTranscriptStatus}</span>
                                    </div>

                                    <div className="mt-4">
                                        {postCallCandidateTranscript ? (
                                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{postCallCandidateTranscript}</p>
                                        ) : postCallTranscriptStatus === "transcribing" ? (
                                            <p className="text-sm text-slate-600">Aufnahme wird gerade transkribiert.</p>
                                        ) : postCallTranscriptStatus === "recording" ? (
                                            <p className="text-sm text-slate-600">Call laeuft. Das Transkript wird nach dem Beenden aus dem MediaRecorder erzeugt.</p>
                                        ) : (
                                            <p className="text-sm text-slate-600">Nach dem Call erscheint hier das Aufnahme-Transkript des Kandidaten.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-[20px] border bg-slate-50 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">Gesamtes Interview</p>
                                                <p className="text-xs text-slate-500">KI + Kandidat in einer Aufnahme</p>
                                            </div>
                                            <span className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-600">{interviewRecapStatus}</span>
                                        </div>

                                        <div className="mt-4">
                                            {interviewRecapUrl ? (
                                                <div className="space-y-3">
                                                    <audio controls preload="metadata" src={interviewRecapUrl} className="w-full">
                                                        Dein Browser unterstuetzt das Audio-Element nicht.
                                                    </audio>
                                                    <p className="text-xs text-slate-500">Der Recap mischt die Interviewer- und Kandidatenstimme in eine gemeinsame Datei.</p>
                                                </div>
                                            ) : interviewRecapStatus === "recording" ? (
                                                <p className="text-sm text-slate-600">Das komplette Interview wird parallel mitgeschnitten und steht nach dem Beenden hier bereit.</p>
                                            ) : interviewRecapStatus === "error" ? (
                                                <p className="text-sm text-red-600">{interviewRecapError || "Der Interview-Recap konnte nicht erstellt werden."}</p>
                                            ) : (
                                                <p className="text-sm text-slate-600">Nach dem Call kannst du hier das gesamte Interview abspielen.</p>
                                            )}

                                            {interviewRecapCaptureNote ? (
                                                <p className="mt-3 text-xs text-amber-700">{interviewRecapCaptureNote}</p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="rounded-[20px] border bg-slate-50 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">Timing-Analyse</p>
                                                <p className="text-xs text-slate-500">Nur Metriken, die im Transkript nicht direkt sichtbar sind</p>
                                            </div>
                                            <span className="rounded-full border bg-white px-3 py-1.5 text-xs text-slate-600">
                                                {hasTimingMetrics ? `${interviewTimingMetrics.answerCount} Antworten` : "noch leer"}
                                            </span>
                                        </div>

                                        <div className="mt-4">
                                            {hasTimingMetrics ? (
                                                <dl className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-2xl border bg-white p-3">
                                                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Gesamte Sprechzeit</dt>
                                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                                            {formatCountdown(Math.max(0, Math.round(interviewTimingMetrics.totalCandidateSpeechMs / 1_000)))}
                                                        </dd>
                                                    </div>
                                                    <div className="rounded-2xl border bg-white p-3">
                                                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Words per Minute</dt>
                                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                                            {formatMetricWordsPerMinute(interviewTimingMetrics.candidateWordsPerMinute)}
                                                        </dd>
                                                    </div>
                                                    <div className="rounded-2xl border bg-white p-3">
                                                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Durchschn. Antwortdauer</dt>
                                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                                            {formatMetricSeconds(interviewTimingMetrics.averageAnswerDurationMs)}
                                                        </dd>
                                                    </div>
                                                    <div className="rounded-2xl border bg-white p-3">
                                                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Laengste Antwort</dt>
                                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                                            {formatMetricSeconds(interviewTimingMetrics.longestAnswerDurationMs)}
                                                        </dd>
                                                    </div>
                                                    <div className="rounded-2xl border bg-white p-3">
                                                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Kuerzeste Antwort</dt>
                                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                                            {formatMetricSeconds(interviewTimingMetrics.shortestAnswerDurationMs)}
                                                        </dd>
                                                    </div>
                                                    <div className="rounded-2xl border bg-white p-3">
                                                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Durchschn. Reaktionszeit</dt>
                                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                                            {formatMetricSeconds(interviewTimingMetrics.averageResponseLatencyMs)}
                                                        </dd>
                                                    </div>
                                                    <div className="rounded-2xl border bg-white p-3 sm:col-span-2">
                                                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Laengste Denkpause vor einer Antwort</dt>
                                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                                            {formatMetricSeconds(interviewTimingMetrics.longestResponseLatencyMs)}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            ) : callLifecyclePhase === "interviewing" ? (
                                                <p className="text-sm text-slate-600">Sobald der Kandidat auf eine Frage antwortet, erscheinen hier Antwortdauer, Reaktionszeit und Sprechtempo.</p>
                                            ) : (
                                                <p className="text-sm text-slate-600">Nach dem ersten beantworteten Interviewturn erscheinen hier reine Timing-Metriken.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    )
}

function InterviewVoicePageContent() {
    const searchParams = useSearchParams()
    const role = searchParams.get("role") ?? "Backend Developer"
    return <VoiceInterview key={role} role={role} />
}

export default function InterviewVoicePage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
            <InterviewVoicePageContent />
        </Suspense>
    )
}
