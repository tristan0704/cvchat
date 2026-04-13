"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewInterviewPage() {
  const [step, setStep] = useState(1);

  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [type, setType] = useState("");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Interview starten</h1>
        <p className="mt-4 text-gray-400">
          Erstelle dein individuelles Interview
        </p>

        {/* CARD */}
        <div className="mt-8 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
          {/* STEP INDICATOR */}
          <p className="text-sm text-gray-400 mb-4">Schritt {step} von 4</p>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">1. Zielrolle auswählen</h2>

              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="z. B. Frontend Developer"
                className="w-full rounded-md bg-gray-900 px-3 py-2 outline outline-1 outline-white/10 focus:outline-indigo-500"
              />
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">2. Erfahrung auswählen</h2>

              <div className="grid grid-cols-3 gap-3">
                {["Junior", "Mid", "Senior"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setExperience(lvl)}
                    className={`rounded-md px-4 py-2 text-sm ${
                      experience === lvl
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-900 hover:bg-white/5"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">3. Unternehmensgröße</h2>

              <div className="grid grid-cols-3 gap-3">
                {["Startup", "Mittelstand", "Konzern"].map((size) => (
                  <button
                    key={size}
                    onClick={() => setCompanySize(size)}
                    className={`rounded-md px-4 py-2 text-sm ${
                      companySize === size
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-900 hover:bg-white/5"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">4. Interview Typ</h2>

              <div className="grid gap-3">
                {["HR Interview", "Technical Interview", "Case Interview"].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`rounded-md px-4 py-2 text-sm ${
                        type === t
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-900 hover:bg-white/5"
                      }`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="text-sm text-gray-400 hover:text-white disabled:opacity-30"
            >
              Zurück
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400"
              >
                Weiter
              </button>
            ) : (
              <button
                onClick={() => {
                  const id = crypto.randomUUID(); // einfache ID erzeugen
                  const params = new URLSearchParams({
                    role,
                    experience,
                    companySize,
                    type,
                  });

                  router.push(`/interviews/${id}?${params.toString()}`);
                }}
                className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium hover:bg-green-400"
              >
                Interview starten
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
