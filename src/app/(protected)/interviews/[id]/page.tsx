"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import InterviewVoiceStep from "@/components/interviews/InterviewVoiceStep";

function FeedbackBlock({
  score,
  summary,
  positives,
  negatives,
}: {
  score: number;
  summary: string;
  positives: string[];
  negatives: string[];
}) {
  let color = "";
  let label = "";
  let barColor = "";

  if (score >= 75) {
    color = "bg-green-500/20 text-green-300";
    barColor = "bg-green-400";
    label = "Gut";
  } else if (score >= 50) {
    color = "bg-yellow-500/20 text-yellow-300";
    barColor = "bg-yellow-400";
    label = "Mittel";
  } else {
    color = "bg-red-500/20 text-red-300";
    barColor = "bg-red-400";
    label = "Schlecht";
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Score</p>
            <p className="text-2xl font-semibold text-white">{score}%</p>
          </div>

          <span className={`rounded-md px-3 py-1 text-sm ${color}`}>
            {label}
          </span>
        </div>

        <div className="mt-3 h-2 w-full rounded bg-gray-700">
          <div
            className={`h-2 rounded ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
        {summary}
      </div>

      <div className="rounded-lg bg-green-500/10 p-4">
        <p className="mb-2 text-sm font-medium text-green-300">Positiv</p>
        <ul className="space-y-1 text-sm text-green-200">
          {positives.map((positive, index) => (
            <li key={index}>• {positive}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-red-500/10 p-4">
        <p className="mb-2 text-sm font-medium text-red-300">Verbesserung</p>
        <ul className="space-y-1 text-sm text-red-200">
          {negatives.map((negative, index) => (
            <li key={index}>• {negative}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function InterviewDetailPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Interview</h1>

        <p className="mt-2 text-gray-400">Schritt {step} von 6</p>

        <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold">CV Feedback</h2>

              <FeedbackBlock
                score={82}
                summary="Dein Lebenslauf ist solide und zeigt gute technische Kenntnisse, jedoch fehlen messbare Erfolge."
                positives={[
                  "Starke React Kenntnisse",
                  "Saubere Struktur",
                  "Relevante Projekte vorhanden",
                ]}
                negatives={[
                  "Keine messbaren Ergebnisse",
                  "Beschreibungen zu allgemein",
                  "Soft Skills fehlen",
                ]}
              />
            </div>
          )}

          {step === 2 && <InterviewVoiceStep />}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold">Interview Feedback</h2>

              <FeedbackBlock
                score={74}
                summary="Die Antwort war korrekt, aber nicht tief genug ausgeführt."
                positives={["Grundverständnis vorhanden", "Beispiel genannt"]}
                negatives={["Lifecycle nicht erwähnt", "Zu oberflächlich"]}
              />
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold">Code Aufgabe</h2>

              <div className="mt-4 rounded-md bg-gray-900 p-4 text-sm">
                Implementiere eine Funktion, die ein Array reversed.
              </div>

              <textarea className="mt-4 w-full rounded-md bg-gray-900 p-3 font-mono" />
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-lg font-semibold">Code Feedback</h2>

              <FeedbackBlock
                score={68}
                summary="Die Lösung funktioniert, ist aber nicht optimal umgesetzt."
                positives={["Logik korrekt", "Grundidee richtig"]}
                negatives={["Built-in reverse genutzt", "Keine eigene Lösung"]}
              />
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="text-lg font-semibold">Gesamtbewertung</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "CV",
                    score: 82,
                    summary:
                      "Stark strukturiert, aber zu wenig messbare Ergebnisse.",
                  },
                  {
                    label: "Interview",
                    score: 74,
                    summary:
                      "Gutes Verständnis, aber zu oberflächlich erklärt.",
                  },
                  {
                    label: "Code",
                    score: 68,
                    summary: "Funktioniert, aber nicht optimal umgesetzt.",
                  },
                ].map((item, index) => {
                  let badgeColor = "";
                  let ratingLabel = "";

                  if (item.score >= 75) {
                    badgeColor = "bg-green-500/20 text-green-300";
                    ratingLabel = "Gut";
                  } else if (item.score >= 50) {
                    badgeColor = "bg-yellow-500/20 text-yellow-300";
                    ratingLabel = "Mittel";
                  } else {
                    badgeColor = "bg-red-500/20 text-red-300";
                    ratingLabel = "Schlecht";
                  }

                  return (
                    <div
                      key={index}
                      className="rounded-lg bg-gray-900 p-4 outline outline-1 outline-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{item.label}</p>

                        <span
                          className={`rounded-md px-2 py-0.5 text-xs ${badgeColor}`}
                        >
                          {ratingLabel}
                        </span>
                      </div>

                      <p className="mt-2 text-lg font-semibold text-white">
                        {item.score}%
                      </p>

                      <p className="mt-2 text-xs text-gray-300">
                        {item.summary}
                      </p>
                    </div>
                  );
                })}
              </div>

              <FeedbackBlock
                score={75}
                summary="Solides Interview mit Verbesserungspotenzial in Tiefe und Codequalität."
                positives={["Gutes Verständnis", "Strukturierte Antworten"]}
                negatives={["Zu wenig Tiefe", "Code nicht optimal"]}
              />
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="text-sm text-gray-400 disabled:opacity-30"
            >
              Zurück
            </button>

            {step < 6 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-md bg-indigo-500 px-4 py-2"
              >
                Weiter
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
                  onClick={() => {
                    const newId = crypto.randomUUID();
                    router.push(`/interviews/${newId}`);
                  }}
                >
                  Neu starten
                </button>
                <button
                  onClick={() => router.push("/interviews")}
                  className="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400"
                >
                  Abschließen
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
