import Link from "next/link"

export default function HomePage() {
    return (
        <main className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-xl">

                <section className="mb-20">
                    <h1 className="text-4xl font-semibold mb-6">
                        CVChat
                    </h1>

                    <p className="text-lg mb-8 text-gray-700">
                        Make your CV interactive.
                    </p>

                    <p className="mb-12 text-gray-600 leading-relaxed">
                        Upload your resume, get a shareable link, and let recruiters ask
                        questions directly about your experience.
                        Answers are based only on what’s written in your CV.
                    </p>

                    <Link
                        href="/upload"
                        className="inline-block rounded-md bg-black px-7 py-4 text-white font-medium"
                    >
                        Try it now →
                    </Link>

                    <p className="mt-6 text-sm text-gray-500">
                        No hallucinations · No recruiter accounts required
                    </p>
                </section>

                <section className="mb-20 space-y-10">
                    <div>
                        <h3 className="font-medium mb-2">
                            1. Upload your CV
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Upload a text-based PDF resume.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2">
                            2. Get a private link
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Share it with recruiters or include it in applications.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2">
                            3. Recruiters ask questions
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Answers come only from the information in your CV.
                        </p>
                    </div>
                </section>

                <section className="pb-10">
                    <p className="text-xs text-gray-400">
                        Early access · Feedback welcome
                    </p>
                </section>

            </div>
        </main>
    )
}
