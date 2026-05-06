"use client";

import type { FaceAnalysisWindow } from "@/lib/face-analysis";
import type { AppDictionary } from "@/lib/i18n/dictionaries";

export function FaceActivityGraph({
    windows,
    labels,
}: {
    windows: FaceAnalysisWindow[];
    labels: AppDictionary["interviewFeedback"];
}) {
    if (windows.length < 2) return null;

    const width = 400;
    const height = 120;
    const padding = 10;
    
    const maxIndex = windows.length - 1;
    const getX = (index: number) => (index / maxIndex) * (width - 2 * padding) + padding;
    const getY = (pct: number) => height - padding - (pct * (height - 2 * padding));

    const presencePoints = windows
        .map((w, i) => `${getX(i)},${getY(w.faceDetectedPct)}`)
        .join(" ");

    const speakingPoints = windows
        .map((w, i) => `${getX(i)},${getY(w.speakingActivityPct)}`)
        .join(" ");

    const presenceArea = `M ${getX(0)},${height - padding} ` + 
        windows.map((w, i) => `L ${getX(i)},${getY(w.faceDetectedPct)}`).join(" ") +
        ` L ${getX(maxIndex)},${height - padding} Z`;

    const speakingArea = `M ${getX(0)},${height - padding} ` + 
        windows.map((w, i) => `L ${getX(i)},${getY(w.speakingActivityPct)}`).join(" ") +
        ` L ${getX(maxIndex)},${height - padding} Z`;

    return (
        <div className="rounded-xl bg-gray-950/30 p-4 outline outline-1 outline-white/5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {labels.faceActivityTimeline || "Activity Timeline"}
                </p>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-gray-400 font-medium">{labels.faceInFrame}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full bg-violet-500" />
                        <span className="text-[10px] text-gray-400 font-medium">{labels.speakingActivity}</span>
                    </div>
                </div>
            </div>

            <div className="relative h-[120px] w-full">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-full w-full overflow-visible"
                    preserveAspectRatio="none"
                >
                    {/* Grid lines */}
                    <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="currentColor" className="text-white/5" strokeWidth="1" />
                    <line x1={padding} y1={getY(0.5)} x2={width - padding} y2={getY(0.5)} stroke="currentColor" className="text-white/5" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={padding} y1={getY(1)} x2={width - padding} y2={getY(1)} stroke="currentColor" className="text-white/5" strokeWidth="1" />

                    {/* Areas */}
                    <path d={presenceArea} className="fill-emerald-500/5" />
                    <path d={speakingArea} className="fill-violet-500/10" />

                    {/* Lines */}
                    <polyline
                        points={presencePoints}
                        fill="none"
                        className="stroke-emerald-500/30"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <polyline
                        points={speakingPoints}
                        fill="none"
                        className="stroke-violet-500"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            
            <div className="mt-2 flex justify-between text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                <span>Start</span>
                <span>{labels.interviewDuration || "Duration"}</span>
            </div>
        </div>
    );
}
