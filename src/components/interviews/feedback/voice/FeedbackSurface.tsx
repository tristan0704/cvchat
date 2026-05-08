"use client";

import type { ReactNode } from "react";

import type { FaceAnalysisStatus } from "@/lib/face-analysis";

export type ScoreToneLabels = {
    scoreStrong: string;
    scoreSolid: string;
    scoreWeak: string;
};

export function clampPercent(value: number) {
    return Math.max(0, Math.min(100, value));
}

export function getScoreTone(score: number, labels: ScoreToneLabels) {
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

export function getFaceStatusTone(status: FaceAnalysisStatus) {
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

export function FeedbackSurface({
    children,
    className = "",
    variant = "default",
}: {
    children: ReactNode;
    className?: string;
    variant?: "default" | "highlight" | "dark" | "compact" | "glass";
}) {
    const variantClass = "bg-gray-900/50";
    const paddingClass = variant === "compact" ? "p-4" : "p-6";

    return (
        <section
            className={`rounded-xl ${variantClass} ${paddingClass} outline outline-1 outline-white/10 ${className}`.trim()}
        >
            {children}
        </section>
    );
}

export function FeedbackPanel({
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

export function StatusBadge({
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

export function SectionHeading({
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

export function ProgressBar({
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
