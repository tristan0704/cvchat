"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { InterviewTimingMetrics } from "@/lib/voice-interview/core/types";
import {
    formatMetricSeconds,
    formatMetricWordsPerMinute,
} from "@/lib/voice-interview/core/formatters";

type MeterTone = "low" | "good" | "watch";

function clamp(value: number) {
    return Math.max(0, Math.min(100, value));
}

function msToSeconds(value: number) {
    return Math.max(0, value / 1_000);
}

function getWpmMeta(wpm: number | null, labels: AppDictionary["interviewFeedback"]) {
    if (wpm === null || wpm < 90) {
        return { label: labels.pacingTooSlow, tone: "low" as const };
    }

    if (wpm > 165) {
        return { label: labels.pacingTooFast, tone: "watch" as const };
    }

    return { label: labels.pacingSteady, tone: "good" as const };
}

function getAnswerMeta(seconds: number, labels: AppDictionary["interviewFeedback"]) {
    if (seconds < 20) {
        return { label: labels.answerTooShort, tone: "low" as const };
    }

    if (seconds > 90) {
        return { label: labels.answerTooLong, tone: "watch" as const };
    }

    return { label: labels.answerBalanced, tone: "good" as const };
}

function getPauseMeta(seconds: number, labels: AppDictionary["interviewFeedback"]) {
    if (seconds <= 4) {
        return { label: labels.pauseControlled, tone: "good" as const };
    }

    if (seconds <= 8) {
        return { label: labels.pauseWatch, tone: "watch" as const };
    }

    return { label: labels.pauseLong, tone: "low" as const };
}

function toneClasses(tone: MeterTone) {
    if (tone === "good") {
        return "bg-emerald-400/20 text-emerald-200 outline-emerald-300/20";
    }

    if (tone === "watch") {
        return "bg-amber-400/20 text-amber-200 outline-amber-300/20";
    }

    return "bg-sky-400/20 text-sky-200 outline-sky-300/20";
}

function MeterRow({
    label,
    value,
    marker,
    meta,
    zoneStart,
    zoneWidth,
}: {
    label: string;
    value: string;
    marker: number;
    meta: { label: string; tone: MeterTone };
    zoneStart: number;
    zoneWidth: number;
}) {
    return (
        <div className="space-y-2 rounded-xl bg-gray-950/40 p-3 outline outline-1 outline-white/10">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200">{label}</p>
                    <p className="mt-1 text-xs text-gray-500">{value}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold outline outline-1 ${toneClasses(meta.tone)}`}>
                    {meta.label}
                </span>
            </div>

            <div className="relative h-3 rounded-full bg-gray-800">
                <span
                    className="absolute top-0 h-full rounded-full bg-white/[0.12]"
                    style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }}
                />
                <span
                    className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow"
                    style={{ left: `calc(${clamp(marker)}% - 0.5rem)` }}
                />
            </div>
        </div>
    );
}

export function SpeakingPacingMeter({
    metrics,
    labels,
}: {
    metrics: InterviewTimingMetrics;
    labels: AppDictionary["interviewFeedback"];
}) {
    const wpm = metrics.candidateWordsPerMinute;
    const averageAnswerSeconds = msToSeconds(metrics.averageAnswerDurationMs);
    const averagePauseSeconds = msToSeconds(metrics.averageResponseLatencyMs);

    return (
        <div className="grid gap-3 lg:grid-cols-3">
            <MeterRow
                label={labels.wordsPerMinute}
                value={formatMetricWordsPerMinute(wpm)}
                marker={((wpm ?? 0) / 190) * 100}
                meta={getWpmMeta(wpm, labels)}
                zoneStart={47}
                zoneWidth={40}
            />
            <MeterRow
                label={labels.averageAnswer}
                value={formatMetricSeconds(metrics.averageAnswerDurationMs)}
                marker={(averageAnswerSeconds / 120) * 100}
                meta={getAnswerMeta(averageAnswerSeconds, labels)}
                zoneStart={17}
                zoneWidth={58}
            />
            <MeterRow
                label={labels.averageLatency}
                value={formatMetricSeconds(metrics.averageResponseLatencyMs)}
                marker={(averagePauseSeconds / 12) * 100}
                meta={getPauseMeta(averagePauseSeconds, labels)}
                zoneStart={8}
                zoneWidth={28}
            />
        </div>
    );
}
