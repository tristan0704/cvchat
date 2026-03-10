import Link from "next/link"

export default function HomePage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
                <section className="w-full rounded-[28px] border bg-white p-8 sm:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">CareerPitch</p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Einfacher Hiring Flow</h1>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-slate-700">
                        Rolle waehlen, CV hochladen, Interview durchlaufen, Feedback sehen und am Ende eine einfache
                        Gesamtanalyse bekommen.
                    </p>
                    <Link
                        href="/simulate/new"
                        className="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                    >
                        Simulation starten
                    </Link>
                </section>
            </div>
        </main>
    )
}
