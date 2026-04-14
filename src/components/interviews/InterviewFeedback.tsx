"use client";

import { useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";

import type { FaceAnalysisParameterReport, FaceAnalysisReport } from "@/lib/face-analysis";
import { buildInterviewTranscriptFingerprint } from "@/lib/interview-feedback/fingerprint";
import {
    loadFaceBodyLanguageSummary,
    loadInterviewFaceAnalysisReport,
} from "@/lib/interview-feedback/storage";
import { useInterviewFeedbackAnalysis } from "@/lib/interview-feedback/use-interview-feedback-analysis";
import { formatCountdown } from "@/lib/interview";
import type { InterviewFeedbackEvaluationDimension } from "@/lib/interview-feedback/types";
import { useOptionalInterviewSession } from "@/lib/interview-session/context";
import { getInterviewSessionId } from "@/lib/interview-session/session-id";
import {
    formatMetricSeconds,
    formatMetricWordsPerMinute,
} from "@/lib/voice-interview/core/formatters";

const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
});

function getScoreTone(score: number) {
    if (score >= 75) {
        return {
            badge: "bg-green-500/20 text-green-300",
            bar: "bg-green-400",
            label: "Stark",
        };
    }

    if (score >= 50) {
        return {
            badge: "bg-yellow-500/20 text-yellow-300",
            bar: "bg-yellow-400",
            label: "Solide",
        };
    }

    return {
        badge: "bg-red-500/20 text-red-300",
        bar: "bg-red-400",
        label: "Schwach",
    };
}

function getFaceStatusTone(status: FaceAnalysisReport["overallStatus"]) {
    switch (status) {
        case "strong":
            return "bg-green-500/20 text-green-300";
        case "okay":
            return "bg-sky-500/20 text-sky-300";
        case "watch":
            return "bg-yellow-500/20 text-yellow-300";
        default:
            return "bg-red-500/20 text-red-300";
    }
}

function formatPercent(value: number) {
    return `${PERCENT_FORMATTER.format(value * 100)}%`;
}

function SurfaceCard({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`rounded-xl border border-white/10 bg-gray-900 p-5 ${className}`.trim()}
        >
            {children}
        </section>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
    badge,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    badge?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                {eyebrow ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                        {eyebrow}
                    </p>
                ) : null}
                <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
                {description ? (
                    <p className="mt-2 max-w-3xl text-sm text-gray-300">
                        {description}
                    </p>
                ) : null}
            </div>
            {badge}
        </div>
    );
}

function ScoreCard({
    title,
    value,
    feedback,
}: {
    title: string;
    value: InterviewFeedbackEvaluationDimension["score"];
    feedback: InterviewFeedbackEvaluationDimension["feedback"];
}) {
    const tone = getScoreTone(value);

    return (
        <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-200">{title}</p>
                <span className={`rounded-full px-3 py-1 text-xs ${tone.badge}`}>
                    {value}%
                </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-800">
                <div
                    className={`h-2 rounded-full ${tone.bar}`}
                    style={{ width: `${value}%` }}
                />
            </div>

            <p className="mt-3 text-sm text-gray-300">{feedback}</p>
        </SurfaceCard>
    );
}

function ListCard({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: string[];
    emptyLabel: string;
}) {
    return (
        <SurfaceCard>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                {title}
            </p>

            <ul className="mt-3 space-y-2 text-sm text-gray-200">
                {items.length > 0 ? (
                    items.map((item) => <li key={`${title}-${item}`}>{item}</li>)
                ) : (
                    <li className="text-gray-500">{emptyLabel}</li>
                )}
            </ul>
        </SurfaceCard>
    );
}

function MetricCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-gray-950 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                {label}
            </p>
            <p className="mt-2 text-xl font-semibold text-white">{value}</p>
            {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
        </div>
    );
}

function FaceParameterCard({
    parameter,
}: {
    parameter: FaceAnalysisParameterReport;
}) {
    const tone = getFaceStatusTone(parameter.status);

    return (
        <SurfaceCard>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-gray-200">
                        {parameter.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                        {parameter.valueLabel}
                    </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${tone}`}>
                    {parameter.score.toFixed(0)}%
                </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-800">
                <div
                    className="h-2 rounded-full bg-indigo-400"
                    style={{ width: `${parameter.score}%` }}
                />
            </div>

            <p className="mt-3 text-sm text-gray-300">{parameter.summary}</p>
        </SurfaceCard>
    );
}

function AnalysisStateCard(args: {
    role: string;
    experience: string;
    companySize: string;
    interviewType: string;
    transcriptStatus: string;
    transcriptError: string;
    analysisStatus: "idle" | "loading" | "ready" | "error";
    analysisError: string;
    overallScore: number | null;
    summary: string;
    passedLikely: boolean | null;
}) {
    if (args.analysisStatus === "ready" && args.overallScore !== null) {
        const tone = getScoreTone(args.overallScore);

        return (
            <SurfaceCard>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                            <span>{args.role}</span>
                            {args.experience ? <span>{args.experience}</span> : null}
                            {args.companySize ? <span>{args.companySize}</span> : null}
                            {args.interviewType ? (
                                <span>{args.interviewType}</span>
                            ) : null}
                            <span>
                                {args.passedLikely
                                    ? "Wahrscheinlich passend"
                                    : "Noch unsicher"}
                            </span>
                        </div>

                        <h2 className="text-xl font-semibold text-white">
                            Interview Feedback
                        </h2>
                        <p className="max-w-3xl text-sm text-gray-300">
                            {args.summary}
                        </p>
                    </div>

                    <div className="min-w-[220px] rounded-xl border border-white/10 bg-gray-950 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-gray-400">Overall score</p>
                            <span
                                className={`rounded-full px-3 py-1 text-xs ${tone.badge}`}
                            >
                                {tone.label}
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-white">
                            {args.overallScore}%
                        </p>
                        <div className="mt-3 h-2 rounded-full bg-gray-800">
                            <div
                                className={`h-2 rounded-full ${tone.bar}`}
                                style={{ width: `${args.overallScore}%` }}
                            />
                        </div>
                    </div>
                </div>
            </SurfaceCard>
        );
    }

    if (args.analysisStatus === "loading") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow="Interview Analyse"
                    title="Interview wird ausgewertet"
                    description="Das komplette Interview-Transkript wird gerade mit dem neuen Bewertungs-Prompt analysiert."
                    badge={
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                            GPT laeuft
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    if (args.analysisStatus === "error") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow="Interview Analyse"
                    title="Analyse fehlgeschlagen"
                    description={
                        args.analysisError ||
                        "Die Interview-Auswertung konnte nicht geladen werden."
                    }
                    badge={
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                            Fehler
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    if (args.transcriptStatus === "transcribing") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow="Interview Analyse"
                    title="Transkript wird vorbereitet"
                    description="Sobald das Aufnahme-Transkript fertig ist, startet die strukturierte GPT-Auswertung automatisch."
                    badge={
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                            Transcribing
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    if (args.transcriptStatus === "error") {
        return (
            <SurfaceCard>
                <SectionHeading
                    eyebrow="Interview Analyse"
                    title="Transkript nicht verfuegbar"
                    description={
                        args.transcriptError ||
                        "Das Interview konnte nicht in Text umgewandelt werden."
                    }
                    badge={
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                            Fehler
                        </span>
                    }
                />
            </SurfaceCard>
        );
    }

    return (
        <SurfaceCard>
            <SectionHeading
                eyebrow="Interview Analyse"
                title="Feedback wird nach dem Call erstellt"
                description="Beende zuerst das Interview. Anschliessend werden Replay, Timing, Face-Metriken und die neue GPT-Auswertung angezeigt."
                badge={
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                        {args.transcriptStatus}
                    </span>
                }
            />
        </SurfaceCard>
    );
}

export default function InterviewFeedback() {
    const session = useOptionalInterviewSession();
    const params = useParams<{ id?: string }>();
    const interviewId = getInterviewSessionId(params?.id);
    const controller = session?.voiceInterview ?? null;
    const role = session?.role ?? "Backend Developer";
    const experience = session?.config.experience ?? "";
    const companySize = session?.config.companySize ?? "";
    const interviewType = session?.config.interviewType ?? "";
    const transcriptExport = controller?.transcriptExport ?? "";

    const transcriptFingerprint = useMemo(
        () => buildInterviewTranscriptFingerprint(transcriptExport),
        [transcriptExport]
    );
    const analysisEnabled =
        controller?.postCallTranscriptStatus === "ready" &&
        transcriptExport.trim().length > 0;

    const analysis = useInterviewFeedbackAnalysis({
        interviewId,
        enabled: Boolean(controller) && analysisEnabled,
        role,
        experience,
        companySize,
        interviewType,
        transcript: transcriptExport,
        transcriptFingerprint,
    });

    const faceAnalysisReport = controller
        ? loadInterviewFaceAnalysisReport(interviewId)
        : null;
    const faceBodyLanguageSummary = controller
        ? loadFaceBodyLanguageSummary()
        : null;

    const evaluation = analysis.evaluation;

    if (!session || !controller) {
        return null;
    }

    return (
        <div className="space-y-6">
            <AnalysisStateCard
                role={role}
                experience={experience}
                companySize={companySize}
                interviewType={interviewType}
                transcriptStatus={controller.postCallTranscriptStatus}
                transcriptError={controller.postCallTranscriptError}
                analysisStatus={analysis.status}
                analysisError={analysis.error}
                overallScore={evaluation?.overallScore ?? null}
                summary={evaluation?.summary ?? ""}
                passedLikely={evaluation?.passedLikely ?? null}
            />

            {evaluation ? (
                <>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <ScoreCard
                            title="Communication"
                            value={evaluation.communication.score}
                            feedback={evaluation.communication.feedback}
                        />
                        <ScoreCard
                            title="Answer Quality"
                            value={evaluation.answerQuality.score}
                            feedback={evaluation.answerQuality.feedback}
                        />
                        <ScoreCard
                            title="Role Fit"
                            value={evaluation.roleFit.score}
                            feedback={evaluation.roleFit.feedback}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <ListCard
                            title="Strengths"
                            items={evaluation.strengths}
                            emptyLabel="Noch keine Staerken erkannt."
                        />
                        <ListCard
                            title="Issues"
                            items={evaluation.issues}
                            emptyLabel="Keine akuten Schwachstellen erkannt."
                        />
                        <ListCard
                            title="Improvements"
                            items={evaluation.improvements}
                            emptyLabel="Keine konkreten Verbesserungen vorhanden."
                        />
                    </div>
                </>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <SurfaceCard>
                    <SectionHeading
                        eyebrow="Media"
                        title="Interview Replay"
                        description="Replay der gemeinsamen Aufnahme mit Interviewer- und Kandidatenstimme."
                        badge={
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                                {controller.interviewRecapStatus}
                            </span>
                        }
                    />

                    <div className="mt-4">
                        {controller.interviewRecapUrl ? (
                            <div className="space-y-3">
                                <audio
                                    controls
                                    preload="metadata"
                                    src={controller.interviewRecapUrl}
                                    className="w-full accent-indigo-500"
                                >
                                    Dein Browser unterstuetzt das Audio-Element
                                    nicht.
                                </audio>
                                <p className="text-sm text-gray-400">
                                    Der Replay-Track mischt beide Stimmen in einer
                                    gemeinsamen Aufnahme.
                                </p>
                            </div>
                        ) : controller.interviewRecapStatus === "recording" ? (
                            <p className="text-sm text-gray-400">
                                Der Replay-Track wird gerade noch verarbeitet.
                            </p>
                        ) : controller.interviewRecapStatus === "error" ? (
                            <p className="text-sm text-red-300">
                                {controller.interviewRecapError ||
                                    "Das Replay konnte nicht erstellt werden."}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400">
                                Nach dem Interview erscheint hier die gemeinsame
                                Replay-Aufnahme.
                            </p>
                        )}

                        {controller.interviewRecapCaptureNote ? (
                            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                                {controller.interviewRecapCaptureNote}
                            </p>
                        ) : null}
                    </div>
                </SurfaceCard>

                <SurfaceCard>
                    <SectionHeading
                        eyebrow="Transcript"
                        title="Interview Transcript"
                        description="Dieselbe strukturierte Export-Basis wird fuer die GPT-Auswertung verwendet."
                        badge={
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                                {controller.postCallTranscriptStatus}
                            </span>
                        }
                    />

                    <div className="mt-4">
                        {transcriptExport ? (
                            <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-gray-950 p-4 text-sm leading-6 text-gray-200">
                                {transcriptExport}
                            </pre>
                        ) : controller.postCallTranscriptStatus === "transcribing" ? (
                            <p className="text-sm text-gray-400">
                                Das Interview-Transkript wird gerade erzeugt.
                            </p>
                        ) : controller.postCallTranscriptStatus === "error" ? (
                            <p className="text-sm text-red-300">
                                {controller.postCallTranscriptError ||
                                    "Das Interview-Transkript konnte nicht erstellt werden."}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400">
                                Nach dem Interview erscheint hier der komplette
                                strukturierte Transcript-Export.
                            </p>
                        )}
                    </div>
                </SurfaceCard>
            </div>

            <SurfaceCard>
                <SectionHeading
                    eyebrow="Timing"
                    title="Timing Metrics"
                    description="WPM und Antwort-Timing bleiben als eigene Signale neben der GPT-Auswertung sichtbar."
                    badge={
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                            {controller.hasTimingMetrics
                                ? `${controller.interviewTimingMetrics.answerCount} Antworten`
                                : "noch leer"}
                        </span>
                    }
                />

                <div className="mt-4">
                    {controller.hasTimingMetrics ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                label="Gesamte Sprechzeit"
                                value={formatCountdown(
                                    Math.max(
                                        0,
                                        Math.round(
                                            controller.interviewTimingMetrics
                                                .totalCandidateSpeechMs / 1_000
                                        )
                                    )
                                )}
                            />
                            <MetricCard
                                label="Words per Minute"
                                value={formatMetricWordsPerMinute(
                                    controller.interviewTimingMetrics
                                        .candidateWordsPerMinute
                                )}
                            />
                            <MetricCard
                                label="Durchschn. Antwort"
                                value={formatMetricSeconds(
                                    controller.interviewTimingMetrics
                                        .averageAnswerDurationMs
                                )}
                            />
                            <MetricCard
                                label="Laengste Antwort"
                                value={formatMetricSeconds(
                                    controller.interviewTimingMetrics
                                        .longestAnswerDurationMs
                                )}
                            />
                            <MetricCard
                                label="Kuerzeste Antwort"
                                value={formatMetricSeconds(
                                    controller.interviewTimingMetrics
                                        .shortestAnswerDurationMs
                                )}
                            />
                            <MetricCard
                                label="Durchschn. Reaktionszeit"
                                value={formatMetricSeconds(
                                    controller.interviewTimingMetrics
                                        .averageResponseLatencyMs
                                )}
                            />
                            <MetricCard
                                label="Laengste Denkpause"
                                value={formatMetricSeconds(
                                    controller.interviewTimingMetrics
                                        .longestResponseLatencyMs
                                )}
                            />
                            <MetricCard
                                label="Antworten"
                                value={String(
                                    controller.interviewTimingMetrics.answerCount
                                )}
                            />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">
                            Nach dem ersten beantworteten Interviewturn erscheinen
                            hier Sprechzeit, Reaktionszeit und WPM.
                        </p>
                    )}
                </div>
            </SurfaceCard>

            <SurfaceCard>
                <SectionHeading
                    eyebrow="Face"
                    title="Face Metrics"
                    description="Video-Metriken bleiben erhalten und werden im selben dunklen Feedback-System dargestellt."
                    badge={
                        faceAnalysisReport ? (
                            <span
                                className={`rounded-full px-3 py-1 text-xs ${getFaceStatusTone(
                                    faceAnalysisReport.overallStatus
                                )}`}
                            >
                                {faceAnalysisReport.overallScore.toFixed(0)}%
                            </span>
                        ) : (
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                                {faceBodyLanguageSummary?.sampleCount
                                    ? `${faceBodyLanguageSummary.sampleCount} Samples`
                                    : "keine Daten"}
                            </span>
                        )
                    }
                />

                {faceAnalysisReport ? (
                    <div className="mt-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                label="Headline"
                                value={faceAnalysisReport.summary.headline}
                            />
                            <MetricCard
                                label="Gesicht im Frame"
                                value={formatPercent(
                                    faceAnalysisReport.globalMetrics.faceDetectedPct
                                )}
                            />
                            <MetricCard
                                label="Sprechaktivitaet"
                                value={formatPercent(
                                    faceAnalysisReport.globalMetrics
                                        .speakingActivityPct
                                )}
                            />
                            <MetricCard
                                label="Blinkrate"
                                value={`${NUMBER_FORMATTER.format(
                                    faceAnalysisReport.globalMetrics
                                        .blinkRatePerMin
                                )}/min`}
                            />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            {faceAnalysisReport.parameters.map((parameter) => (
                                <FaceParameterCard
                                    key={parameter.key}
                                    parameter={parameter}
                                />
                            ))}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <ListCard
                                title="Strengths"
                                items={faceAnalysisReport.summary.strengths}
                                emptyLabel="Keine besonderen Staerken erkannt."
                            />
                            <ListCard
                                title="Risks"
                                items={faceAnalysisReport.summary.risks}
                                emptyLabel="Keine besonderen Risiken erkannt."
                            />
                            <ListCard
                                title="Next Steps"
                                items={faceAnalysisReport.summary.nextSteps}
                                emptyLabel="Keine naechsten Schritte vorhanden."
                            />
                        </div>

                        {faceAnalysisReport.alerts.length > 0 ? (
                            <ListCard
                                title="Alerts"
                                items={faceAnalysisReport.alerts.map(
                                    (alert) => alert.message
                                )}
                                emptyLabel="Keine Alerts vorhanden."
                            />
                        ) : null}
                    </div>
                ) : faceBodyLanguageSummary && faceBodyLanguageSummary.sampleCount > 0 ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            label="Gesicht im Frame"
                            value={formatPercent(
                                faceBodyLanguageSummary.faceDetectedPct
                            )}
                        />
                        <MetricCard
                            label="Fokus zur Kamera"
                            value={formatPercent(
                                faceBodyLanguageSummary.avgFrontalFacingScore
                            )}
                        />
                        <MetricCard
                            label="Sprechaktivitaet"
                            value={formatPercent(
                                faceBodyLanguageSummary.speakingActivityPct
                            )}
                        />
                        <MetricCard
                            label="Blinkrate"
                            value={`${NUMBER_FORMATTER.format(
                                faceBodyLanguageSummary.blinkRatePerMin
                            )}/min`}
                        />
                        <MetricCard
                            label="Kopfbewegung"
                            value={NUMBER_FORMATTER.format(
                                faceBodyLanguageSummary.avgHeadMovement
                            )}
                        />
                        <MetricCard
                            label="Mundoeffnung"
                            value={NUMBER_FORMATTER.format(
                                faceBodyLanguageSummary.avgMouthOpenness
                            )}
                        />
                        <MetricCard
                            label="Samples"
                            value={String(faceBodyLanguageSummary.sampleCount)}
                        />
                        <MetricCard
                            label="Status"
                            value={
                                faceBodyLanguageSummary.webcamActive
                                    ? "Kamera aktiv"
                                    : "Kamera beendet"
                            }
                        />
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-400">
                        Fuer dieses Interview sind noch keine Face-Metriken
                        verfuegbar. Aktiviere im Live-Call die Kamera, damit die
                        Face-Auswertung Daten sammeln kann.
                    </p>
                )}
            </SurfaceCard>
        </div>
    );
}
