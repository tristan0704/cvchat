import Link from "next/link"

export default function HomePage() {
    return (
        <main className="min-h-screen bg-white px-5 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-4xl">

                {/* brand */}
                <header className="mb-16 sm:mb-24">
          <span className="block text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
            CVChat
          </span>
                </header>

                {/* hero */}
                <section className="mb-20 sm:mb-32">
                    <h1 className="
            text-4xl leading-tight
            sm:text-6xl sm:leading-tight
            font-semibold tracking-tight
            mb-6 sm:mb-10
          ">
                        Make your application interactive
                    </h1>

                    <p className="
            text-lg sm:text-2xl
            text-gray-700
            mb-6 sm:mb-10
            max-w-2xl
          ">
                        Turn your entire application into a private, shareable chat.
                    </p>

                    <p className="
            text-gray-600 leading-relaxed
            mb-10 sm:mb-14
            max-w-2xl
          ">
                        Recruiters don’t need to read documents.
                        They ask questions and get precise answers
                        based only on what you uploaded.
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Link
                            href="/upload"
                            className="
                w-full sm:w-auto
                inline-flex items-center justify-center
                rounded-md bg-black
                px-8 py-4
                text-white font-medium
                hover:opacity-90 transition
              "
                        >
                            Create CV chat
                        </Link>

                        <p className="text-sm text-gray-500 text-center sm:text-left">
                            No signup · No recruiter accounts
                        </p>
                    </div>
                </section>

                {/* value props */}
                <section className="
          mb-20 sm:mb-32
          grid gap-10
          sm:grid-cols-3
        ">
                    <div>
                        <p className="text-sm font-medium mb-2 text-gray-900">
                            Full application context
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            CV, references, certificates, and notes are treated as one
                            coherent application.
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-medium mb-2 text-gray-900">
                            Built for recruiters
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Recruiters ask targeted questions instead of scanning PDFs.
                            Faster decisions, less friction.
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-medium mb-2 text-gray-900">
                            Grounded answers
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            If something isn’t in your application,
                            it won’t appear. No hallucinations.
                        </p>
                    </div>
                </section>

                {/* how it works */}
                <section className="mb-20 sm:mb-32">
                    <h2 className="text-xl sm:text-2xl font-semibold mb-8 sm:mb-12">
                        How it works
                    </h2>

                    <div className="space-y-8 sm:space-y-12 max-w-xl">
                        <div>
                            <p className="text-sm font-medium mb-1">
                                1 · Upload your application
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Upload your CV and all supporting documents.
                                Everything is processed together.
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-1">
                                2 · Share a private link
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Send one private link to recruiters.
                                No accounts required.
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-1">
                                3 · Let recruiters ask
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Recruiters ask questions and get instant,
                                document-based answers.
                            </p>
                        </div>
                    </div>
                </section>

                {/* footer */}
                <footer className="pt-10 sm:pt-12 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                        Early access · Built for modern hiring workflows
                    </p>
                </footer>

            </div>
        </main>
    )
}
