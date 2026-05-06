"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import type { AppDictionary } from "@/lib/i18n/dictionaries";

function formatAudioTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return "0:00";
    }

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;

    return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function CustomAudioPlayer({
    src,
    labels,
    variant = "default",
}: {
    src: string;
    labels: AppDictionary["interviewFeedback"];
    variant?: "default" | "minimal";
}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration || 0);
        const handleEnded = () => setIsPlaying(false);
        const handlePause = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("durationchange", handleLoadedMetadata);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("play", handlePlay);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("durationchange", handleLoadedMetadata);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("play", handlePlay);
        };
    }, [src]);

    async function togglePlayback() {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        if (isPlaying) {
            audio.pause();
            return;
        }

        await audio.play().catch(() => setIsPlaying(false));
    }

    function handleSeek(event: MouseEvent<HTMLButtonElement>) {
        const audio = audioRef.current;
        if (!audio || duration <= 0) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * duration;
        setCurrentTime(audio.currentTime);
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const containerClasses =
        variant === "minimal"
            ? "bg-transparent p-0 outline-none"
            : "rounded-xl bg-gray-950/70 p-4 outline outline-1 outline-violet-300/20";

    const buttonSize = variant === "minimal" ? "size-9" : "size-11";

    return (
        <div className={containerClasses}>
            <audio ref={audioRef} preload="metadata" src={src}>
                {labels.audioUnsupported}
            </audio>

            <div className="flex items-center gap-3 md:gap-4">
                <button
                    type="button"
                    onClick={() => void togglePlayback()}
                    className={`flex ${buttonSize} shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-semibold text-white outline outline-1 outline-violet-300/30 transition hover:bg-violet-500/30 focus:outline-2 focus:outline-violet-300`}
                    aria-label={isPlaying ? labels.audioPause : labels.audioPlay}
                >
                    {isPlaying ? (
                        "II"
                    ) : (
                        <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={handleSeek}
                        className="group relative h-4 w-full rounded-full focus:outline-none focus:ring-2 focus:ring-violet-300"
                        aria-label={labels.audioSeek}
                    >
                        <span className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/10" />
                        <span
                            className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 shadow-[0_0_16px_rgba(167,139,250,0.35)]"
                            style={{ width: `${progress}%` }}
                        />
                        <span
                            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow-lg transition group-hover:scale-110"
                            style={{ left: `calc(${progress}% - 0.5rem)` }}
                        />
                    </button>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                        <span>{formatAudioTime(currentTime)}</span>
                        <span>{formatAudioTime(duration)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
