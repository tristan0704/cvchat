import type { InterviewTemplateSummary } from "@/db-backend/interviews/interview-template-service";

type LearnInterviewCatalogProps = {
    labels: {
        title: string;
        description: string;
        templatesCount: string;
    };
    templates: InterviewTemplateSummary[];
};

export function LearnInterviewCatalog({
    labels,
    templates,
}: LearnInterviewCatalogProps) {
    return (
        <section className="mt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">{labels.title}</h2>
                    <p className="mt-2 text-sm text-gray-400">{labels.description}</p>
                </div>
                <p className="text-sm text-gray-500">
                    {templates.length} {labels.templatesCount}
                </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                    <article
                        key={template.id}
                        className="rounded-xl bg-gray-800/50 p-5 outline outline-1 outline-white/10"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-white">
                                    {template.title}
                                </h3>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-indigo-300">
                                    {template.experience} · {template.companySize}
                                </p>
                            </div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                                {template.role}
                            </span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-gray-400">
                            {template.summary}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}
