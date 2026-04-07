"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      {/* SCORE */}
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

        {/* PROGRESS BAR */}
        <div className="mt-3 h-2 w-full bg-gray-700 rounded">
          <div
            className={`h-2 rounded ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* SUMMARY */}
      <div className="rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
        {summary}
      </div>

      {/* POSITIVES */}
      <div className="rounded-lg bg-green-500/10 p-4">
        <p className="text-sm font-medium text-green-300 mb-2">👍 Positiv</p>
        <ul className="text-sm text-green-200 space-y-1">
          {positives.map((p, i) => (
            <li key={i}>• {p}</li>
          ))}
        </ul>
      </div>

      {/* NEGATIVES */}
      <div className="rounded-lg bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-300 mb-2">👎 Verbesserung</p>
        <ul className="text-sm text-red-200 space-y-1">
          {negatives.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function InterviewDetailPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Erkläre den Unterschied zwischen useState und useEffect.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([
      ...messages,
      { role: "user", text: input },
      {
        role: "ai",
        text: "Gute Antwort! Kannst du noch auf Lifecycle eingehen?",
      },
    ]);

    setInput("");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Interview</h1>

        <p className="mt-2 text-gray-400">Schritt {step} von 6</p>

        <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
          {/* STEP 1 */}
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

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col h-[500px]">
              <h2 className="text-lg font-semibold">Interview</h2>

              <div className="mt-4 flex-1 overflow-y-auto space-y-3 rounded-lg bg-gray-900 p-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 rounded-md bg-gray-800 px-3 py-2 outline outline-1 outline-white/10"
                />
                <button
                  onClick={handleSend}
                  className="rounded-md bg-indigo-500 px-4 py-2"
                >
                  Senden
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
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

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold">Code Aufgabe</h2>

              <div className="mt-4 bg-gray-900 p-4 rounded-md text-sm">
                Implementiere eine Funktion, die ein Array reversed.
              </div>

              <textarea className="mt-4 w-full rounded-md bg-gray-900 p-3 font-mono" />
            </div>
          )}

          {/* STEP 5 */}
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
                ].map((item, i) => {
                  let badgeColor = "";
                  let label = "";

                  if (item.score >= 75) {
                    badgeColor = "bg-green-500/20 text-green-300";
                    label = "Gut";
                  } else if (item.score >= 50) {
                    badgeColor = "bg-yellow-500/20 text-yellow-300";
                    label = "Mittel";
                  } else {
                    badgeColor = "bg-red-500/20 text-red-300";
                    label = "Schlecht";
                  }

                  return (
                    <div
                      key={i}
                      className="rounded-lg bg-gray-900 p-4 outline outline-1 outline-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{item.label}</p>

                        <span
                          className={`rounded-md px-2 py-0.5 text-xs ${badgeColor}`}
                        >
                          {label}
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

              {/* OVERALL FEEDBACK */}
              <FeedbackBlock
                score={75}
                summary="Solides Interview mit Verbesserungspotenzial in Tiefe und Codequalität."
                positives={["Gutes Verständnis", "Strukturierte Antworten"]}
                negatives={["Zu wenig Tiefe", "Code nicht optimal"]}
              />
            </div>
          )}

          {/* NAV */}
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
                  className="rounded-md bg-gray-700 px-4 py-2 text-sm
                  hover:bg-gray-600"
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
