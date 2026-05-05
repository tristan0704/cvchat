import Link from "next/link";

export default function Hero() {
  return (
    <div id="product" className="relative isolate bg-gray-900 px-6 pt-14 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 blur-3xl sm:-top-80"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-30 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-2xl py-16 sm:py-28 lg:py-32">
        <div className="mb-8 hidden justify-center sm:flex">
        </div>


          <div className="mb-8 hidden justify-center sm:flex">
            <div className="relative rounded-full px-3 py-1 text-sm text-gray-400 ring-1 ring-white/10 hover:ring-white/20">
             Vertraut von Studierenden der FH Oberösterreich
            </div>
          </div>


        <div className="text-center">
          <div className="mb-8 flex justify-center sm:mb-10">
            <img
              src="/commit_logo.png"
              alt="Commit Logo"
              className="h-24 w-auto object-contain sm:h-32 lg:h-36"
            />
          </div>

          <h1 className="text-5xl font-semibold text-white sm:text-5xl">
            Werde besser in technischen Interviews. Schnell.
          </h1>

          <p className="mt-8 text-lg text-gray-400 sm:text-xl">
            Commit hilft Tech-Studierenden, Kommunikation, technisches Verständnis und echte Interview-Leistung zu verbessern.
          </p>

          <div className="mt-10 flex justify-center gap-x-6">
            <Link
              href="/auth/register"
              className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Jetzt starten
            </Link>

            <a href="#features" className="content-center text-sm/6 font-semibold text-white">
              Mehr erfahren
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
