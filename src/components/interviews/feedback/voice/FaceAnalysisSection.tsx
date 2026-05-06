"use client";

import type { FaceAnalysisParameterReport, FaceAnalysisReport } from "@/lib/face-analysis";
import type { AppDictionary } from "@/lib/i18n/dictionaries";

import {
    FeedbackPanel,
    FeedbackSurface,
    SectionHeading,
    StatusBadge,
    getFaceStatusTone,
} from "@/components/interviews/feedback/voice/FeedbackSurface";

const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
});

function formatPercent(value: number) {
    return `${PERCENT_FORMATTER.format(value * 100)}%`;
}

function getFaceStatusLabel(
    status: FaceAnalysisParameterReport["status"],
    labels: AppDictionary["interviewFeedback"]
) {
    switch (status) {
        case "strong":
            return labels.faceStatusStrong;
        case "okay":
            return labels.faceStatusOkay;
        case "watch":
            return labels.faceStatusWatch;
        default:
            return labels.faceStatusWeak;
    }
}

function TopMetricCard({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-lg bg-white/[0.04] px-3 py-2 outline outline-1 outline-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {label}
            </p>
            <p className="mt-1 text-lg font-semibold leading-6 text-white">
                {value}
            </p>
        </div>
    );
}

function FaceParameterCard({
    parameter,
    labels,
}: {
    parameter: FaceAnalysisParameterReport;
    labels: AppDictionary["interviewFeedback"];
}) {
    const tone = getFaceStatusTone(parameter.status);
    const statusLabel = getFaceStatusLabel(parameter.status, labels);

    return (
        <div className="rounded-xl bg-gray-950/45 px-4 py-3 outline outline-1 outline-white/10">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-100">
                        {parameter.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">
                        {parameter.valueLabel}
                        <span className="mx-2 text-gray-600">/</span>
                        {parameter.summary}
                    </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${tone}`}>
                    {statusLabel}
                </span>
            </div>
        </div>
    );
}

function ListBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: string[];
    emptyLabel: string;
}) {
    return (
        <FeedbackPanel className="bg-gray-950/35">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                {title}
            </p>
            {items.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-gray-200">
                    {items.slice(0, 1).map((item) => (
                        <li key={item} className="rounded-lg bg-white/5 px-3 py-2">
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-sm text-gray-400">{emptyLabel}</p>
            )}
        </FeedbackPanel>
    );
}

export function FaceAnalysisSection({
    report,
    labels,
}: {
    report: FaceAnalysisReport | null;
    labels: AppDictionary["interviewFeedback"];
}) {
    return (
        <FeedbackSurface variant="compact" className="bg-gray-800/35">
            <SectionHeading
                eyebrow={labels.faceEyebrow}
                title={labels.facePresenceTitle}
                description={labels.facePresenceDescription}
                badge={
                    report ? (
                        <span
                            className={`rounded-full px-3 py-1 text-xs ${getFaceStatusTone(
                                report.overallStatus
                            )}`}
                        >
                            {report.overallScore.toFixed(0)}%
                        </span>
                    ) : (
                        <StatusBadge>{labels.noData}</StatusBadge>
                    )
                }
            />

            {report ? (
                <div className="mt-5 space-y-3">
                    <div className="rounded-xl bg-[linear-gradient(135deg,rgba(3,7,18,0.72),rgba(17,24,39,0.62)),radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_32%)] p-4 outline outline-1 outline-white/10">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getFaceStatusTone(
                                            report.overallStatus
                                        )}`}
                                    >
                                        {report.overallScore.toFixed(0)}%
                                    </span>
                                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                                        {labels.facePresenceTitle}
                                    </span>
                                </div>
                                <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-white">
                                    {report.summary.headline}
                                </p>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3 xl:w-[520px]">
                                <TopMetricCard
                                    label={labels.faceInFrame}
                                    value={formatPercent(report.globalMetrics.faceDetectedPct)}
                                />
                                <TopMetricCard
                                    label={labels.speakingActivity}
                                    value={formatPercent(
                                        report.globalMetrics.speakingActivityPct
                                    )}
                                />
                                <TopMetricCard
                                    label={labels.blinkRate}
                                    value={`${NUMBER_FORMATTER.format(
                                        report.globalMetrics.blinkRatePerMin
                                    )}/min`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2 lg:grid-cols-2">
                        {report.parameters.map((parameter) => (
                            <FaceParameterCard
                                key={parameter.key}
                                parameter={parameter}
                                labels={labels}
                            />
                        ))}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                        <ListBlock
                            title={labels.strengths}
                            items={report.summary.strengths}
                            emptyLabel={labels.specialStrengths}
                        />
                        <ListBlock
                            title={labels.risks}
                            items={report.summary.risks}
                            emptyLabel={labels.specialRisks}
                        />
                        <ListBlock
                            title={labels.nextSteps}
                            items={report.summary.nextSteps}
                            emptyLabel={labels.noNextSteps}
                        />
                    </div>

                    {report.alerts.length > 0 ? (
                        <ListBlock
                            title={labels.faceAlerts}
                            items={report.alerts.map((alert) => alert.message)}
                            emptyLabel={labels.faceNoAlerts}
                        />
                    ) : null}
                </div>
            ) : (
                <p className="mt-5 text-sm text-gray-400">{labels.faceEmpty}</p>
            )}
        </FeedbackSurface>
    );
}
