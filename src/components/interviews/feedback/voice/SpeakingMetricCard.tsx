"use client";

import { FeedbackPanel } from "@/components/interviews/feedback/voice/FeedbackSurface";

export function SpeakingMetricCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <FeedbackPanel className="min-h-[108px] min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                {value}
            </p>
            {hint ? <p className="mt-2 text-xs leading-5 text-gray-400">{hint}</p> : null}
        </FeedbackPanel>
    );
}
