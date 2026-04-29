import Footer from "./Footer";
import LandingPageNavbar from "../navigation/LandingPageNavBar";

export default function PublicPageShell({ eyebrow, title, intro, children }) {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <LandingPageNavbar />

            <section className="relative isolate overflow-hidden px-6 pt-28 pb-16 sm:pt-36 lg:px-8">
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl"
                >
                    <div
                        className="relative left-[calc(50%-10rem)] aspect-[1155/678] w-[34rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-24rem)] sm:w-[68rem]"
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
                        }}
                    />
                </div>

                <div className="mx-auto max-w-4xl">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur sm:p-12">
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">
                            {eyebrow}
                        </p>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                            {title}
                        </h1>
                        <p className="mt-6 max-w-3xl text-lg text-gray-300">
                            {intro}
                        </p>

                        <div className="mt-10 space-y-10 text-base leading-7 text-gray-200">
                            {children}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
