"use client";

import type { ReactNode } from "react";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

export type CvScoreToneLabels = Pick<
    AppDictionary["common"],
    "scoreStrong" | "scoreSolid" | "scoreWeak"
>;

export function clampPercent(value: number) {
    return Math.max(0, Math.min(100, value));
}

export function getCvScoreTone(score: number, labels: CvScoreToneLabels) {
    if (score >= 75) {
        return {
            badge: "bg-green-500/20 text-green-300",
            bar: "bg-green-400",
            label: labels.scoreStrong,
        };
    }

    if (score >= 50) {
        return {
            badge: "bg-yellow-500/20 text-yellow-300",
            bar: "bg-yellow-400",
            label: labels.scoreSolid,
        };
    }

    return {
        badge: "bg-red-500/20 text-red-300",
        bar: "bg-red-400",
        label: labels.scoreWeak,
    };
}

export function CvFeedbackSurface({
    children,
    className = "",
    compact = false,
}: {
    children: ReactNode;
    className?: string;
    compact?: boolean;
}) {
    return (
        <section
            className={`rounded-xl bg-gray-900/50 ${compact ? "p-4" : "p-6"} outline outline-1 outline-white/10 ${className}`.trim()}
        >
            {children}
        </section>
    );
}

export function CvFeedbackPanel({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-xl bg-gray-900/80 p-4 outline outline-1 outline-white/10 ${className}`.trim()}
        >
            {children}
        </div>
    );
}

export function CvStatusBadge({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 outline outline-1 outline-white/10 ${className}`.trim()}
        >
            {children}
        </span>
    );
}

export function CvSectionHeading({
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                {eyebrow ? (
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                        {eyebrow}
                    </p>
                ) : null}
                <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">
                    {title}
                </h2>
                {description ? (
                    <p className="mt-2 text-sm text-gray-400">{description}</p>
                ) : null}
            </div>
            {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
    );
}

export function CvProgressBar({
    value,
    className = "bg-indigo-400",
    trackClassName = "bg-gray-800",
}: {
    value: number;
    className?: string;
    trackClassName?: string;
}) {
    return (
        <div className={`h-2 rounded-full ${trackClassName}`.trim()}>
            <div
                className={`h-2 rounded-full ${className}`.trim()}
                style={{ width: `${clampPercent(value)}%` }}
            />
        </div>
    );
}
