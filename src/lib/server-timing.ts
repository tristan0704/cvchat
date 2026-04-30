import "server-only";

type TimingMark = {
    label: string;
    startedAt: number;
};

export function createServerTiming(route: string) {
    const startedAt = performance.now();
    const marks: Array<{
        label: string;
        durationMs: number;
    }> = [];

    return {
        async measure<T>(label: string, callback: () => Promise<T>) {
            const mark: TimingMark = {
                label,
                startedAt: performance.now(),
            };

            try {
                return await callback();
            } finally {
                marks.push({
                    label: mark.label,
                    durationMs: performance.now() - mark.startedAt,
                });
            }
        },
        log(extra: Record<string, unknown> = {}) {
            if (process.env.NODE_ENV !== "development") {
                return;
            }

            console.info("[server-timing]", {
                route,
                totalMs: Math.round(performance.now() - startedAt),
                marks: marks.map((mark) => ({
                    label: mark.label,
                    durationMs: Math.round(mark.durationMs),
                })),
                ...extra,
            });
        },
    };
}
