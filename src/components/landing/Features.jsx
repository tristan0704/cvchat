import Image from "next/image";

const PRODUCT_STEPS = [
  {
    title: "CV hochladen und analysieren",
    description:
      "Lade deinen Lebenslauf hoch und sieh direkt Rollenfit, Struktur und konkrete Optimierungsmöglichkeiten.",
    icon: "/icons/file-solid-full.svg",
    image: {
      src: "/cv_feed.png",
      width: 1323,
      height: 767,
      alt: "Lebenslauf-Feedback mit Score, Rollenfit und konkreten Verbesserungen",
    },
  },
  {
    title: "Realistisches Interview führen",
    description:
      "Übe mit einer ruhigen Call-Oberfläche für Stimme, optionale Kamera und klare Gesprächsführung.",
    icon: "/icons/microphone-solid-full.svg",
    image: {
      src: "/call.png",
      width: 1672,
      height: 941,
      alt: "Live-Interview-Call mit Interviewfrage und Gesprächssteuerung",
    },
  },
  {
    title: "Coding-Challenge lösen",
    description:
      "Trainiere technische Aufgaben direkt im Browser mit realistischem Interview-Kontext.",
    icon: "/icons/code-solid-full.svg",
    image: {
      src: "/coding.png",
      width: 1672,
      height: 941,
      alt: "Coding-Challenge mit Aufgabenstellung, Editor und Ausführen-Schaltfläche",
    },
  },
  {
    title: "Detailliertes Feedback nutzen",
    description:
      "Nutze Score, Skill-Breakdown, Replay und Übungsfokus für den nächsten Durchlauf.",
    icon: "/icons/comment-solid-full.svg",
    image: {
      src: "/in_feedback.png",
      width: 1352,
      height: 822,
      alt: "Interview-Feedback-Report mit Score, Replay und Analysebereichen",
    },
  },
];

export default function Features() {
  return (
    <div id="features" className="bg-gray-900 pb-24 pt-20 sm:pb-32 sm:pt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold text-indigo-400">
            Smarter vorbereiten
          </h2>

          <p className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Alles für dein perfektes Interview
          </p>

          <p className="mt-6 text-lg text-gray-300">
            Bereite dich realistisch auf technische Interviews vor, von CV-Analyse
            bis hin zu Coding-Challenges und detailliertem Feedback.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-4xl space-y-6">
          {PRODUCT_STEPS.map((step, index) => (
            <article
              key={step.title}
              className="overflow-hidden rounded-xl bg-gray-800/50 outline outline-1 outline-white/10"
            >
              <div
                className={`grid items-center gap-0 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1fr)] ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="flex flex-col justify-center p-5 lg:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500">
                      <Image
                        src={step.icon}
                        width={20}
                        height={20}
                        className="h-5 w-5 brightness-0 invert"
                        alt=""
                      />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                      Schritt {index + 1}
                    </p>
                  </div>

                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">
                    {step.description}
                  </p>
                </div>

                <div className="bg-gray-950">
                  <Image
                    src={step.image.src}
                    alt={step.image.alt}
                    width={step.image.width}
                    height={step.image.height}
                    sizes="(min-width: 1024px) 38vw, 100vw"
                    className="mx-auto h-auto w-full max-w-[560px] object-contain"
                    priority={index === 0}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
