"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";

type SupportedLanguage = "javascript" | "python" | "java";

type LanguageConfig = {
    id: SupportedLanguage;
    label: string;
    shortLabel: string;
    fileName: string;
    description: string;
    snippet: string;
};

const LANGUAGE_CONFIGS: LanguageConfig[] = [
    {
        id: "javascript",
        label: "JavaScript",
        shortLabel: "JS",
        fileName: "index.js",
        description: "Ideal fuer kleine Skripte, Utilities und schnelle Prototypen.",
        snippet: `function scoreCandidate(skills) {
    return skills
        .filter((skill) => skill.level >= 7)
        .map((skill) => skill.name.toUpperCase());
}

const shortlisted = scoreCandidate([
    { name: "communication", level: 8 },
    { name: "typescript", level: 9 },
    { name: "testing", level: 6 },
]);

console.log(shortlisted);`,
    },
    {
        id: "python",
        label: "Python",
        shortLabel: "PY",
        fileName: "main.py",
        description: "Gut fuer Datenlogik, Automation und technische Interviews.",
        snippet: `def rank_candidates(candidates):
    qualified = [
        candidate["name"]
        for candidate in candidates
        if candidate["score"] >= 80
    ]
    return sorted(qualified)


top_candidates = rank_candidates(
    [
        {"name": "Mia", "score": 88},
        {"name": "Noah", "score": 76},
        {"name": "Lena", "score": 91},
    ]
)

print(top_candidates)`,
    },
    {
        id: "java",
        label: "Java",
        shortLabel: "JAVA",
        fileName: "Main.java",
        description: "Sinnvoll fuer klassische OOP-Aufgaben und Enterprise-Patterns.",
        snippet: `import java.util.List;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        List<Integer> scores = List.of(74, 82, 95, 68, 88);
        List<Integer> passed = scores.stream()
            .filter(score -> score >= 80)
            .collect(Collectors.toList());

        System.out.println(passed);
    }
}`,
    },
];

const INITIAL_DRAFTS: Record<SupportedLanguage, string> = LANGUAGE_CONFIGS.reduce(
    (drafts, language) => {
        drafts[language.id] = language.snippet;
        return drafts;
    },
    {} as Record<SupportedLanguage, string>,
);

function getLanguageConfig(languageId: SupportedLanguage) {
    return LANGUAGE_CONFIGS.find((language) => language.id === languageId)!;
}

export default function CodeEditorPage() {
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>("javascript");
    const [drafts, setDrafts] = useState<Record<SupportedLanguage, string>>(INITIAL_DRAFTS);

    const currentLanguage = getLanguageConfig(activeLanguage);
    const currentCode = drafts[activeLanguage];
    const lineCount = currentCode.split("\n").length;
    const characterCount = currentCode.length;
    const nonEmptyLineCount = currentCode
        .split("\n")
        .filter((line) => line.trim().length > 0).length;

    function handleCodeChange(value: string | undefined) {
        setDrafts((currentDrafts) => ({
            ...currentDrafts,
            [activeLanguage]: value ?? "",
        }));
    }

    function handleReset() {
        setDrafts((currentDrafts) => ({
            ...currentDrafts,
            [activeLanguage]: currentLanguage.snippet,
        }));
    }

    return (
        <main className="min-h-screen bg-[#f3efe7] px-4 py-6 text-[#111111] sm:px-6 lg:px-8">
            <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col overflow-hidden rounded-[28px] border border-black/10 bg-[#fcfbf7] shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
                <div className="border-b border-black/10 bg-[linear-gradient(135deg,#fff8df_0%,#f6eee1_55%,#efe7db_100%)] px-5 py-5 sm:px-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-black/65 backdrop-blur">
                                Monaco Workbench
                            </div>
                            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                                Code Editor fuer Python, JavaScript und Java
                            </h1>
                            <p className="mt-3 max-w-xl text-sm text-black/70 sm:text-base">
                                Eine fokussierte Coding-Oberflaeche mit Sprachwechsel, eigenen Drafts pro
                                Sprache und einer klaren Workbench statt nur einem leeren Editor.
                            </p>
                        </div>

                        <div className="grid gap-3 rounded-3xl border border-black/10 bg-white/75 p-4 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.06)] backdrop-blur sm:grid-cols-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
                                    Datei
                                </p>
                                <p className="mt-1 font-mono text-sm">{currentLanguage.fileName}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
                                    Zeilen
                                </p>
                                <p className="mt-1 font-mono text-sm">{lineCount}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
                                    Zeichen
                                </p>
                                <p className="mt-1 font-mono text-sm">{characterCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid flex-1 gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="border-b border-black/10 bg-[#f8f4ec] p-4 lg:border-b-0 lg:border-r">
                        <div className="rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
                            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                                Sprachen
                            </p>

                            <div className="mt-3 flex flex-col gap-2">
                                {LANGUAGE_CONFIGS.map((language) => {
                                    const isActive = language.id === activeLanguage;

                                    return (
                                        <button
                                            key={language.id}
                                            type="button"
                                            onClick={() => setActiveLanguage(language.id)}
                                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                                                isActive
                                                    ? "border-[#111111] bg-[#111111] text-white shadow-[0_16px_30px_rgba(17,17,17,0.22)]"
                                                    : "border-black/10 bg-[#fbfaf6] text-[#111111] hover:border-black/25 hover:bg-white"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold">{language.label}</p>
                                                    <p
                                                        className={`mt-1 text-xs ${
                                                            isActive ? "text-white/70" : "text-black/55"
                                                        }`}
                                                    >
                                                        {language.fileName}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] ${
                                                        isActive
                                                            ? "bg-white/14 text-white"
                                                            : "bg-[#efe7d8] text-black/65"
                                                    }`}
                                                >
                                                    {language.shortLabel}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-black/10 bg-[#111111] p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                                Aktiv
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                                {currentLanguage.label}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-white/72">
                                {currentLanguage.description}
                            </p>
                            <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                                        Nicht leere Zeilen
                                    </p>
                                    <p className="mt-1 font-mono text-sm">{nonEmptyLineCount}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="rounded-full border border-white/15 bg-white px-3 py-2 text-xs font-semibold text-[#111111] transition hover:scale-[0.98] hover:bg-[#f1ebdf]"
                                >
                                    Reset Snippet
                                </button>
                            </div>
                        </div>
                    </aside>

                    <section className="flex min-h-[620px] flex-col bg-[#161616]">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#1c1c1c] px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {LANGUAGE_CONFIGS.map((language) => {
                                    const isActive = language.id === activeLanguage;

                                    return (
                                        <button
                                            key={language.id}
                                            type="button"
                                            onClick={() => setActiveLanguage(language.id)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                                isActive
                                                    ? "bg-[#f5dd98] text-[#111111]"
                                                    : "bg-white/8 text-white/70 hover:bg-white/14 hover:text-white"
                                            }`}
                                        >
                                            {language.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/72">
                                {currentLanguage.fileName}
                            </div>
                        </div>

                        <div className="flex-1">
                            <Editor
                                height="100%"
                                language={activeLanguage}
                                value={currentCode}
                                theme="vs-dark"
                                onChange={handleCodeChange}
                                options={{
                                    automaticLayout: true,
                                    fontFamily: "JetBrains Mono, Consolas, monospace",
                                    fontSize: 15,
                                    lineHeight: 24,
                                    minimap: { enabled: false },
                                    padding: { top: 18, bottom: 18 },
                                    scrollBeyondLastLine: false,
                                    smoothScrolling: true,
                                    tabSize: 4,
                                    wordWrap: "on",
                                    bracketPairColorization: { enabled: true },
                                    guides: {
                                        bracketPairs: true,
                                        indentation: true,
                                    },
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#111111] px-4 py-3 text-xs text-white/70">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="font-semibold text-white">{currentLanguage.label}</span>
                                <span>{lineCount} lines</span>
                                <span>{characterCount} chars</span>
                                <span>UTF-8</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <span>Monaco Editor</span>
                                <span>Spaces: 4</span>
                                <span>Word Wrap: On</span>
                            </div>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}
