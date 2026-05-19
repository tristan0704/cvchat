type DashboardScoreRingProps = {
    label: string;
    value: number | null;
};

export function DashboardScoreRing({ label, value }: DashboardScoreRingProps) {
    const normalizedValue = Math.max(0, Math.min(100, value ?? 0));
    const displayValue =
        value === null || value === undefined ? "--" : `${Math.round(value)}%`;
    const circumference = 2 * Math.PI * 22;
    const dashOffset = circumference - (normalizedValue / 100) * circumference;

    return (
        <div className="relative flex size-20 shrink-0 items-center justify-center">
            <svg
                aria-label={label}
                className="size-20 -rotate-90"
                role="img"
                viewBox="0 0 56 56"
            >
                <circle
                    cx="28"
                    cy="28"
                    fill="none"
                    r="22"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-white/10"
                />
                <circle
                    cx="28"
                    cy="28"
                    fill="none"
                    r="22"
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    strokeWidth="5"
                    className="text-indigo-300"
                />
            </svg>
            <span className="absolute max-w-14 text-center text-xs font-semibold leading-none text-white">
                {displayValue}
            </span>
        </div>
    );
}
