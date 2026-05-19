"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

import {
    CvFeedbackPanel,
    CvFeedbackSurface,
    CvStatusBadge,
} from "@/components/cv/feedback/CvFeedbackSurface";

type ActiveCvSummary = {
    fileName: string;
    uploadedAt: string;
};

export function CvFeedbackStateCard({
    labels,
    badges,
    storedCv,
    analyzedAt,
    loadingStoredCv,
    loading,
    error,
    formatDateTime,
    onGenerate,
}: {
    labels: AppDictionary["cvFeedback"];
    badges: string[];
    storedCv: ActiveCvSummary | null;
    analyzedAt?: string;
    loadingStoredCv: boolean;
    loading: boolean;
    error: string;
    formatDateTime: (value: string) => string;
    onGenerate: () => void;
}) {
    return (
        <CvFeedbackSurface>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                        {labels.stepEyebrow}
                    </p>
                    <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">
                        {labels.stepTitle}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        {labels.stepDescription}
                    </p>
                </div>

                {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {badges.map((badge) => (
                            <CvStatusBadge key={badge}>{badge}</CvStatusBadge>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="mt-6">
                {loadingStoredCv ? (
                    <StatePanel>{labels.loadingStoredResume}</StatePanel>
                ) : storedCv ? (
                    <CvFeedbackPanel className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-white">
                                {storedCv.fileName}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                {labels.savedInProfile.replace(
                                    "{date}",
                                    formatDateTime(storedCv.uploadedAt)
                                )}
                            </p>
                            {analyzedAt ? (
                                <p className="mt-1 text-xs text-gray-500">
                                    {labels.lastAnalysis.replace(
                                        "{date}",
                                        formatDateTime(analyzedAt)
                                    )}
                                </p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={onGenerate}
                            disabled={loading}
                            className="rounded-md bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                        >
                            {loading
                                ? labels.analyzing
                                : analyzedAt
                                  ? labels.refreshFeedback
                                  : labels.startFeedback}
                        </button>
                    </CvFeedbackPanel>
                ) : (
                    <CvFeedbackPanel className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-white">
                                {labels.noResumeTitle}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                {labels.noResumeDescription}
                            </p>
                        </div>

                        <Link
                            href="/profile"
                            className="rounded-md bg-white/5 px-4 py-3 text-sm font-semibold text-white outline outline-1 outline-white/10 transition hover:bg-white/10"
                        >
                            {labels.openProfile}
                        </Link>
                    </CvFeedbackPanel>
                )}
            </div>

            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        </CvFeedbackSurface>
    );
}

export function CvReportLoadingCard({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <CvFeedbackSurface className="p-10 text-center text-sm text-gray-400">
            {children}
        </CvFeedbackSurface>
    );
}

function StatePanel({ children }: { children: ReactNode }) {
    return (
        <CvFeedbackPanel>
            <p className="text-sm text-gray-400">{children}</p>
        </CvFeedbackPanel>
    );
}
