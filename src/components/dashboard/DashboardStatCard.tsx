import { DashboardScoreRing } from "@/components/dashboard/DashboardScoreRing";

type DashboardStatCardProps = {
    detail: string;
    label: string;
    ringValue?: number | null;
    value: string;
};

export function DashboardStatCard({
    detail,
    label,
    ringValue,
    value,
}: DashboardStatCardProps) {
    return (
        <div className="rounded-xl bg-gray-800/50 p-5 outline outline-1 outline-white/10">
            <div className="flex min-h-24 items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                    <p className="mt-2 text-xs text-gray-500">{detail}</p>
                </div>
                {ringValue !== undefined ? (
                    <DashboardScoreRing label={label} value={ringValue} />
                ) : null}
            </div>
        </div>
    );
}
