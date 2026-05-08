type DashboardMetricBarItem = {
    label: string;
    value: number;
};

type DashboardMetricBarsProps = {
    emptyLabel: string;
    items: DashboardMetricBarItem[];
};

export function DashboardMetricBars({
    emptyLabel,
    items,
}: DashboardMetricBarsProps) {
    const maxValue = Math.max(...items.map((item) => item.value), 0);

    if (maxValue <= 0) {
        return (
            <div className="rounded-xl bg-gray-900/80 p-4 text-sm text-gray-400 outline outline-1 outline-white/10">
                {emptyLabel}
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-xl bg-gray-900/80 p-4 outline outline-1 outline-white/10">
            {items.map((item) => {
                const width = Math.max(8, Math.round((item.value / maxValue) * 100));

                return (
                    <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                            <span className="text-gray-400">{item.label}</span>
                            <span className="font-semibold text-white">{item.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                            <div
                                className="h-2 rounded-full bg-indigo-300"
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
