"use client";

import { useState } from "react";
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
    const [isExpanded, setIsExpanded] = useState(false);
    const tone = getFaceStatusTone(parameter.status);
    const statusLabel = getFaceStatusLabel(parameter.status, labels);

    return (
        <div className="rounded-xl bg-gray-950/45 px-4 py-3 outline outline-1 outline-white/10 transition-all duration-200">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-100">
                            {parameter.label}
                        </p>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${tone}`}>
                            {statusLabel}
                        </span>
                    </div>
                    
                    <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400">
                            {parameter.valueLabel}
                        </p>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-[10px] font-bold uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            {isExpanded ? labels.hideDetails : labels.showDetails}
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <p className="mt-3 text-xs leading-5 text-gray-300 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-white/5 pt-2">
                    {parameter.summary}
                </p>
            )}
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
        <FeedbackSurface className="p-4">
            <SectionHeading
                title={labels.facePresenceTitle}
                badge={
                    report ? (
                        <StatusBadge className={`${getFaceStatusTone(report.overallStatus)} text-[10px] py-0.5 px-2`}>
                            {report.overallScore.toFixed(0)}%
                        </StatusBadge>
                    ) : (
                        <StatusBadge className="text-[10px] py-0.5 px-2">{labels.noData}</StatusBadge>
                    )
                }
            />

            {report ? (
                <div className="mt-6 space-y-4">
                    <div className="rounded-xl bg-white/[0.02] p-4 outline outline-1 outline-white/5">
                        <p className="text-sm font-semibold leading-relaxed text-white">
                            {report.summary.headline}
                        </p>
                        
                        <div className="mt-4 grid gap-2 grid-cols-2">
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
                        </div>
                    </div>

                    <div className="space-y-2">
                        {report.parameters.map((parameter) => (
                            <FaceParameterCard
                                key={parameter.key}
                                parameter={parameter}
                                labels={labels}
                            />
                        ))}
                    </div>

                    <div className="space-y-3 pt-2">
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
                </div>
            ) : (
                <p className="mt-6 text-xs text-gray-500 text-center py-6">{labels.faceEmpty}</p>
            )}
        </FeedbackSurface>
    );
}
