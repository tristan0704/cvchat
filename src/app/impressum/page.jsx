import PublicPageShell from "../../components/landing/PublicPageShell";

export const metadata = {
    title: "Impressum | CareerPitch",
    description: "Impressum der CareerPitch Landingpage.",
};

const OPERATOR_PLACEHOLDERS = [
    "Rechtsträger: Tristan Trunez",
    "Anschrift: [Rosenauerstraße 7, 4040, Linz, Österreich]",
    "E-Mail: tristan.trunez@outlook.de",
    "Telefon: +43 677 64274501",
];

const REGISTER_PLACEHOLDERS = [
    "Firmenbuch / Handelsregister: nV.",
    "UID / USt-IdNr.: nV.",
    "Aufsichtsbehörde: nV.",
];

export default function ImpressumPage() {
    return (
        <PublicPageShell
            eyebrow="Impressum"
            title="Anbieterkennzeichnung"
            intro="Diese Seite ist technisch eingebunden, enthält aber derzeit noch Platzhalter für die gesetzlich erforderlichen Betreiberangaben. Die markierten Daten müssen vor einem produktiven Livegang ersetzt und rechtlich geprüft werden."
        >
            <section>
                <h2 className="text-2xl font-semibold text-white">
                    Angaben gemäss gesetzlicher Informationspflicht
                </h2>
                <div className="mt-4 space-y-3 text-gray-300">
                    {OPERATOR_PLACEHOLDERS.map((item) => (
                        <p key={item}>{item}</p>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-white">Register- und Steuerangaben</h2>
                <div className="mt-4 space-y-3 text-gray-300">
                    {REGISTER_PLACEHOLDERS.map((item) => (
                        <p key={item}>{item}</p>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-white">Verantwortlich für den Inhalt</h2>
                <p className="mt-4 text-gray-300">
                    Tristan Trunez
                </p>
            </section>
        </PublicPageShell>
    );
}
