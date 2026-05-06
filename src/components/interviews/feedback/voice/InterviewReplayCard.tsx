"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

import { CustomAudioPlayer } from "@/components/interviews/feedback/voice/CustomAudioPlayer";

export function InterviewReplayCard({
    audioUrl,
    recapStatus,
    recapError,
    recapCaptureNote,
    labels,
}: {
    audioUrl?: string;
    recapStatus: string;
    recapError: string;
    recapCaptureNote: string;
    labels: AppDictionary["interviewFeedback"];
}) {
    if (!audioUrl && recapStatus !== "recording" && recapStatus !== "error") {
        return null;
    }

    return (
        <FeedbackSurface variant="compact" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                        {labels.replayEyebrow}
                    </p>
                    <h2 className="text-sm font-semibold text-white">
                        {labels.replayTitle}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge className="text-[10px] py-0.5 px-2">
                        {recapStatus}
                    </StatusBadge>
                    <StatusBadge className="bg-indigo-500/10 text-indigo-300 outline-indigo-300/20 text-[10px] py-0.5 px-2">
                        {labels.liveSessionOnly}
                    </StatusBadge>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                {audioUrl ? (
                    <CustomAudioPlayer src={audioUrl} labels={labels} variant="minimal" />
                ) : recapStatus === "recording" ? (
                    <p className="text-xs text-gray-400 italic py-3 px-4 bg-white/5 rounded-lg text-center">
                        {labels.replayRecording}
                    </p>
                ) : (
                    <p className="text-xs text-red-400 py-3 px-4 bg-red-500/10 rounded-lg text-center">
                        {recapError || labels.replayError}
                    </p>
                )}
            </div>

            {recapCaptureNote && (
                <div className="rounded-lg bg-amber-500/5 p-3 border border-amber-500/10">
                    <p className="text-xs text-amber-200/70 leading-relaxed italic">
                        {recapCaptureNote}
                    </p>
                </div>
            )}
        </FeedbackSurface>
    );
}
