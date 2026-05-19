type ChallengePlaceholder = {
    title: string;
    description: string;
    status: string;
};

type LearnChallengePlaceholdersProps = {
    items: readonly ChallengePlaceholder[];
    title: string;
};

export function LearnChallengePlaceholders({
    items,
    title,
}: LearnChallengePlaceholdersProps) {
    return (
        <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                        Roadmap
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item, index) => (
                    <article
                        key={item.title}
                        className="rounded-xl bg-gray-800/50 p-5 outline outline-1 outline-white/10"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-sm font-semibold text-indigo-200 outline outline-1 outline-indigo-300/20">
                                {index + 1}
                            </div>
                            <p className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 outline outline-1 outline-white/10">
                                {item.status}
                            </p>
                        </div>

                        <p className="mt-5 text-base font-semibold text-white">
                            {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            {item.description}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}
