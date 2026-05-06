"use client";

import type { FaceAnalysisReport } from "@/lib/face-analysis";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { FeedbackSurface, SectionHeading } from "@/components/interviews/feedback/voice/FeedbackSurface";

export function PerformanceTimelineChart({
    report,
    labels,
}: {
    report: FaceAnalysisReport;
    labels: AppDictionary["interviewFeedback"];
}) {
    const windows = report.windows;
    if (windows.length < 2) return null;

    const width = 800;
    const height = 80;
    const padding = 5;
    
    const maxIndex = windows.length - 1;
    const getX = (index: number) => (index / maxIndex) * (width - 2 * padding) + padding;
    // Multiplier for peaks visibility
    const getY = (pct: number) => height - padding - (pct * (height - 2 * padding));

    // Speaking Intensity (Main Area)
    const speakingPoints = windows
        .map((w, i) => `${getX(i)},${getY(w.speakingActivityPct)}`)
        .join(" ");
    const speakingArea = `M ${getX(0)},${height - padding} ` + 
        windows.map((w, i) => `L ${getX(i)},${getY(w.speakingActivityPct)}`).join(" ") +
        ` L ${getX(maxIndex)},${height - padding} Z`;

    return (
        <FeedbackSurface className="space-y-4">
            <div className="flex items-center justify-between">
                <SectionHeading
                    title={labels.performanceTimelineTitle || "Performance Timeline"}
                />
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-sm bg-indigo-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {labels.speakingActivity}
                    </span>
                </div>
            </div>

            <div className="relative">
                <div className="h-[80px] w-full">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="h-full w-full overflow-visible"
                        preserveAspectRatio="none"
                    >
                        {/* Grid lines */}
                        {[0, 1].map((p) => (
                            <line
                                key={p}
                                x1={0}
                                y1={getY(p)}
                                x2={width}
                                y2={getY(p)}
                                stroke="currentColor"
                                className="text-white/5"
                                strokeWidth="1"
                            />
                        ))}

                        {/* Speaking Area */}
                        <path d={speakingArea} className="fill-indigo-500/10" />

                        {/* Speaking Line */}
                        <polyline
                            points={speakingPoints}
                            fill="none"
                            className="stroke-indigo-500"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                <div className="mt-2 flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                    <span>0:00</span>
                    <span>{report.durationLabel}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <InsightCard
                    label={labels.avgConfidence || "Avg. Confidence"}
                    value={(report.globalMetrics.avgFrontalFacingScore * 100).toFixed(0) + "%"}
                />
                <InsightCard
                    label={labels.deliveryStability || "Stability"}
                    value={(report.globalMetrics.stableWindowPct * 100).toFixed(0) + "%"}
                />
                <InsightCard
                    label={labels.speakingActivity}
                    value={(report.globalMetrics.speakingActivityPct * 100).toFixed(1) + "%"}
                />
                <InsightCard
                    label={labels.blinkRate}
                    value={report.globalMetrics.blinkRatePerMin.toFixed(1) + "/min"}
                />
            </div>
        </FeedbackSurface>
    );
}

function InsightCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-white/[0.02] p-3 outline outline-1 outline-white/5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-white tracking-tight">{value}</p>
        </div>
    );
}
