"use client";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

import { CustomAudioPlayer } from "@/components/interviews/feedback/voice/CustomAudioPlayer";
import { FeedbackSurface } from "@/components/interviews/feedback/voice/FeedbackSurface";

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
    return (
        <FeedbackSurface variant="compact" className="h-full">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {labels.replayEyebrow}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                        {labels.replayTitle}
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 outline outline-1 outline-white/10">
                        {recapStatus}
                    </span>
                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-100 outline outline-1 outline-violet-300/20">
                        {labels.liveSessionOnly}
                    </span>
                </div>
            </div>

            <div className="mt-4">
                {audioUrl ? (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <CustomAudioPlayer src={audioUrl} labels={labels} />
                        <div className="rounded-xl bg-gray-950/45 p-4 outline outline-1 outline-white/10">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                                {labels.reviewMode}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-300">
                                {labels.replayReadyDescription}
                            </p>
                        </div>
                    </div>
                ) : recapStatus === "recording" ? (
                    <CompactReplayState>{labels.replayRecording}</CompactReplayState>
                ) : recapStatus === "error" ? (
                    <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 outline outline-1 outline-red-500/20">
                        {recapError || labels.replayError}
                    </p>
                ) : (
                    <CompactReplayState>
                        {labels.replayEmpty}
                    </CompactReplayState>
                )}

                {recapCaptureNote ? (
                    <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                        {recapCaptureNote}
                    </p>
                ) : null}
            </div>
        </FeedbackSurface>
    );
}

function CompactReplayState({ children }: { children: string }) {
    return (
        <p className="rounded-xl bg-gray-950/40 px-4 py-3 text-sm leading-6 text-gray-400 outline outline-1 outline-white/10">
            {children}
        </p>
    );
}
