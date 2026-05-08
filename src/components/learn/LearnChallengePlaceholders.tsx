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
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
                {items.map((item) => (
                    <article
                        key={item.title}
                        className="rounded-xl bg-gray-800/40 p-5 outline outline-1 outline-dashed outline-white/15"
                    >
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            {item.description}
                        </p>
                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-gray-500">
                            {item.status}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}
