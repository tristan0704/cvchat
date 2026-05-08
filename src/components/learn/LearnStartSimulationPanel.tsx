import Link from "next/link";

type LearnStartSimulationPanelProps = {
    buttonLabel: string;
    description: string;
    title: string;
};

export function LearnStartSimulationPanel({
    buttonLabel,
    description,
    title,
}: LearnStartSimulationPanelProps) {
    return (
        <section className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                    <h2 className="text-xl font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm text-gray-400">{description}</p>
                </div>
                <Link
                    href="/interviews/new"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                    {buttonLabel}
                </Link>
            </div>
        </section>
    );
}
