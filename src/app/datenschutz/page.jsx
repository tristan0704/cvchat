import PublicPageShell from "../../components/landing/PublicPageShell";

export const metadata = {
    title: "Datenschutz | CareerPitch",
    description: "Datenschutzhinweise für CareerPitch.",
};

const DATA_POLICY_SECTIONS = [
    {
        heading: "Verantwortliche Stelle",
        paragraphs: [
            "Verantwortlich für die Datenverarbeitung ist: Tristan Trunez.",
            "Rosenauerstraße 7, 4040 Linz.",
            "WICHTIG: Die Seite ist derzeit nur ein Technik-Test!",
        ],
    },
    {
        heading: "Welche Daten verarbeitet werden",
        paragraphs: [
            "CareerPitch verarbeitet je nach Nutzung insbesondere Registrierungsdaten, Profildaten, hochgeladene CV-Dateien, Interviewkonfigurationen, Antworten innerhalb von Interviewsimulationen sowie daraus abgeleitete Feedback- und Bewertungsdaten.",
            "Sofern Audio- oder sprachbezogene Funktionen genutzt werden, können zudem Sprachaufnahmen, Transkripte und technische Sitzungsdaten verarbeitet werden.",
        ],
    },
    {
        heading: "Zwecke der Verarbeitung",
        paragraphs: [
            "Die Verarbeitung erfolgt zur Bereitstellung der Plattform, zur Durchführung von Interviewsimulationen, zur Analyse von Nutzerinputs, zur Erstellung von Feedback sowie zur technischen Sicherheit und Stabilität des Dienstes.",
            "Für eine bessere Performance verwenden wir externe KI- oder Infrastrukturprovider wie OpenAI und Google. ",
        ],
    },
    {
        heading: "Rechtsgrundlagen und Empfänger",
        paragraphs: [
            "Die konkreten Rechtsgrundlagen, Auftragsverarbeiter und Drittlandtransfers sind noch projektspezifisch zu vervollständigen. Vor dem produktiven Einsatz sollten hier mindestens Vertragsgrundlage, berechtigtes Interesse, Einwilligungen und eingesetzte Dienstleister sauber dokumentiert werden.",
            "Ergänze ausserdem Speicherfristen, Löschkonzepte und Hinweise auf Betroffenenrechte.",
        ],
    },
    {
        heading: "Hinweis zum aktuellen Stand",
        paragraphs: [
            "Diese Datenschutzseite ist als strukturierte Vorlage eingebunden, stellt aber noch keinen abschliessend geprüften Rechtstext dar.",
            "Vor der Veröffentlichung müssen alle Platzhalter, Anbieterangaben und dienstleisterbezogenen Passagen durch die tatsächlichen Informationen ersetzt werden.",
        ],
    },
];

export default function DatenschutzPage() {
    return (
        <PublicPageShell
            eyebrow="DSGVO"
            title="Datenschutzhinweise"
            intro="Diese Seite bildet die Datenschutzstruktur für CareerPitch ab. Da im Repository keine verifizierten Betreiber- und Verarbeitungsangaben vorliegen, sind die noch offenen Stellen bewusst als Platzhalter markiert."
        >
            {DATA_POLICY_SECTIONS.map((section) => (
                <section key={section.heading}>
                    <h2 className="text-2xl font-semibold text-white">{section.heading}</h2>
                    <div className="mt-4 space-y-4 text-gray-300">
                        {section.paragraphs.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>
                </section>
            ))}
        </PublicPageShell>
    );
}
