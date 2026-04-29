"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InterviewTemplateSummary = {
    id: string;
    title: string;
    role: string;
    roleKey: string;
    experience: string;
    companySize: string;
    summary: string;
};

type InterviewTemplateCatalog = {
    roles: string[];
    experiences: string[];
    companySizes: string[];
    templates: InterviewTemplateSummary[];
};

function StepButton({
    children,
    active,
    onClick,
}: {
    children: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-md px-4 py-2 text-sm ${
                active
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-900 hover:bg-white/5"
            }`}
        >
            {children}
        </button>
    );
}

export default function NewInterviewPage() {
    const [step, setStep] = useState(1);
    const [catalog, setCatalog] = useState<InterviewTemplateCatalog | null>(null);
    const [role, setRole] = useState("");
    const [experience, setExperience] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        async function hydrateCatalog() {
            setLoadingCatalog(true);
            setError("");

            try {
                const response = await fetch("/api/interviews/config", {
                    method: "GET",
                    cache: "no-store",
                });
                const data = (await response.json().catch(() => null)) as
                    | { catalog?: InterviewTemplateCatalog; error?: string }
                    | null;

                if (!response.ok || !data?.catalog) {
                    throw new Error(
                        data?.error ||
                            "Interview-Konfiguration konnte nicht geladen werden."
                    );
                }

                if (!cancelled) {
                    setCatalog(data.catalog);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Interview-Konfiguration konnte nicht geladen werden."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingCatalog(false);
                }
            }
        }

        void hydrateCatalog();

        return () => {
            cancelled = true;
        };
    }, []);

    const roleTemplates = useMemo(
        () =>
            (catalog?.templates ?? []).filter((template) => template.role === role),
        [catalog?.templates, role]
    );
    const experienceOptions = useMemo(
        () => [...new Set(roleTemplates.map((template) => template.experience))],
        [roleTemplates]
    );
    const companySizeTemplates = useMemo(
        () =>
            roleTemplates.filter((template) => template.experience === experience),
        [experience, roleTemplates]
    );
    const companySizeOptions = useMemo(
        () =>
            [...new Set(companySizeTemplates.map((template) => template.companySize))],
        [companySizeTemplates]
    );
    const selectedTemplate = useMemo(
        () =>
            companySizeTemplates.find(
                (template) => template.companySize === companySize
            ) ?? null,
        [companySize, companySizeTemplates]
    );

    async function handleCreateInterview() {
        if (!selectedTemplate) {
            setError("Bitte waehle eine vollstaendige Interview-Konfiguration.");
            return;
        }

        setCreating(true);
        setError("");

        try {
            const response = await fetch("/api/interviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    templateId: selectedTemplate.id,
                }),
            });
            const data = (await response.json().catch(() => null)) as
                | { interview?: { id: string }; error?: string }
                | null;

            if (!response.ok || !data?.interview?.id) {
                throw new Error(
                    data?.error || "Interview konnte nicht erstellt werden."
                );
            }

            router.push(`/interviews/${data.interview.id}`);
        } catch (createError) {
            setError(
                createError instanceof Error
                    ? createError.message
                    : "Interview konnte nicht erstellt werden."
            );
        } finally {
            setCreating(false);
        }
    }

    function selectRole(value: string) {
        setRole(value);
        setExperience("");
        setCompanySize("");
    }

    function selectExperience(value: string) {
        setExperience(value);
        setCompanySize("");
    }

    function selectCompanySize(value: string) {
        setCompanySize(value);
    }

    if (loadingCatalog) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <main className="mx-auto max-w-7xl px-4 py-10">
                    <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                        Interview-Konfiguration wird geladen...
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <main className="mx-auto max-w-7xl px-4 py-10">
                <h1 className="text-3xl font-bold">Interview starten</h1>
                <p className="mt-4 text-gray-400">
                    Waehle eine DB-gestuetzte Interview-Konfiguration.
                </p>

                <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
                    <p className="mb-4 text-sm text-gray-400">Schritt {step} von 3</p>

                    {step === 1 ? (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">1. Zielrolle</h2>
                            <div className="grid gap-3 md:grid-cols-3">
                                {(catalog?.roles ?? []).map((item) => (
                                    <StepButton
                                        key={item}
                                        active={role === item}
                                        onClick={() => selectRole(item)}
                                    >
                                        {item}
                                    </StepButton>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {step === 2 ? (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">2. Erfahrung</h2>
                            <div className="grid gap-3 md:grid-cols-3">
                                {experienceOptions.map((item) => (
                                    <StepButton
                                        key={item}
                                        active={experience === item}
                                        onClick={() => selectExperience(item)}
                                    >
                                        {item}
                                    </StepButton>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {step === 3 ? (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">
                                3. Unternehmensgröße
                            </h2>
                            <div className="grid gap-3 md:grid-cols-3">
                                {companySizeOptions.map((item) => (
                                    <StepButton
                                        key={item}
                                        active={companySize === item}
                                        onClick={() => selectCompanySize(item)}
                                    >
                                        {item}
                                    </StepButton>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {step === 3 && selectedTemplate ? (
                        <div className="mt-4 rounded-lg bg-gray-900 p-4 text-sm text-gray-300 outline outline-1 outline-white/10">
                            <p className="font-medium text-white">
                                {selectedTemplate.title}
                            </p>
                            {selectedTemplate.summary ? (
                                <p className="mt-2">{selectedTemplate.summary}</p>
                            ) : null}
                        </div>
                    ) : null}

                    {error ? <p className="mt-6 text-sm text-red-400">{error}</p> : null}

                    <div className="mt-6 flex justify-between">
                        <button
                            type="button"
                            onClick={() => setStep((currentStep) => currentStep - 1)}
                            disabled={step === 1 || creating}
                            className="text-sm text-gray-400 hover:text-white disabled:opacity-30"
                        >
                            Zurück
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep((currentStep) => currentStep + 1)}
                                disabled={
                                    creating ||
                                    (step === 1 && !role) ||
                                    (step === 2 && !experience) ||
                                    (step === 3 && !companySize)
                                }
                                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Weiter
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void handleCreateInterview()}
                                disabled={!selectedTemplate || creating}
                                className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating ? "Erstelle..." : "Interview starten"}
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
