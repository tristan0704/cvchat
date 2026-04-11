const METRIC_SECONDS_FORMATTER = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})

const METRIC_INTEGER_FORMATTER = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
})

export function formatMetricSeconds(durationMs: number): string {
    return `${METRIC_SECONDS_FORMATTER.format(durationMs / 1_000)} s`
}

export function formatMetricWordsPerMinute(wordsPerMinute: number | null): string {
    if (!Number.isFinite(wordsPerMinute)) return "-"
    return `${METRIC_INTEGER_FORMATTER.format(wordsPerMinute || 0)} WPM`
}
