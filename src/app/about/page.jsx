import PublicPageShell from "../../components/landing/PublicPageShell";

export const metadata = {
    title: "About Us | CareerPitch",
    description: "Erfahre mehr über CareerPitch, unsere Mission und den Fokus der Plattform.",
};

const TEAM_MEMBERS = [
    { name: "Tristan Trunez", role: "Founder & Lead Developer" },
    { name: "Max S.", role: "Developer" },
    { name: "Christoph B.", role: "Developer" },
    { name: "Moritz K.", role: "Strategy und Marketing" },
];

const ABOUT_SECTIONS = [
    {
        heading: "Warum CareerPitch existiert",
        paragraphs: [
            "CareerPitch wurde gebaut, um technische Interviews greifbarer, öfter trainierbar und ehrlicher auswertbar zu machen. Viele Kandidat:innen kennen die Theorie, scheitern aber an realistischen Gesprächssituationen, Zeitdruck und unklarem Feedback.",
            "Die Plattform verbindet Interviewsimulation, technische Übungen und strukturiertes Feedback in einem zusammenhängenden Ablauf. Ziel ist nicht nur Vorbereitung, sondern messbare Verbesserung über mehrere Durchläufe hinweg.",
        ],
    },
    {
        heading: "Wofür die Plattform gedacht ist",
        paragraphs: [
            "CareerPitch richtet sich vor allem an Tech-Studierende, Berufseinsteiger:innen und Kandidat:innen, die ihre Kommunikation, technische Argumentation und Interviewpräsenz systematisch trainieren wollen.",
            "Im Mittelpunkt stehen realistische Übungsszenarien: vom CV-Feedback über simulierte Interviewfragen bis hin zu Coding-Challenges und einer zusammenfassenden Auswertung.",
        ],
    },
    {
        heading: "Unsere Produktmission",
        paragraphs: [
            "Wir wollen Interviewvorbereitung von vereinzelten Tipps und Zufallsfeedback zu einem klaren, wiederholbaren Lernprozess machen. Gute Vorbereitung soll nicht vom Netzwerk, Glück oder manueller Mock-Interview-Verfügbarkeit abhängen.",
            "CareerPitch soll Kandidat:innen helfen, sicherer aufzutreten, bessere Antworten zu formulieren und die Lücke zwischen Wissen und Performance im echten Gespräch zu schliessen.",
        ],
    },
];

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

export default function AboutPage() {
    return (
        <PublicPageShell
            eyebrow="About Us"
            title="Wir bauen realistische Vorbereitung für technische Interviews."
            intro="CareerPitch kombiniert Interviewsimulation, technische Bewertung und klares Feedback zu einer Plattform, die Kandidat:innen gezielt auf reale Auswahlprozesse vorbereitet. Teile unseres Teams kommen von der FH Hagenberg."
        >
            {ABOUT_SECTIONS.map((section) => (
                <section key={section.heading}>
                    <h2 className="text-2xl font-semibold text-white">{section.heading}</h2>
                    <div className="mt-4 space-y-4 text-gray-300">
                        {section.paragraphs.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>
                </section>
            ))}

            <section>
                <h2 className="text-2xl font-semibold text-white">Unser Team</h2>
                <p className="mt-4 max-w-3xl text-gray-300">
                    Wir bauen CareerPitch als kleines Team mit Produkt-, Entwicklungs- und
                    Go-to-Market-Fokus.
                </p>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                    {TEAM_MEMBERS.map((member) => (
                        <article
                            key={member.name}
                            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-300 text-xl font-semibold text-slate-700">
                                    {getInitials(member.name)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                                    <p className="text-sm text-gray-300">{member.role}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </PublicPageShell>
    );
}
