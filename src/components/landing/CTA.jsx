import Link from "next/link";

export default function CTA() {
  return (
    <section className="bg-gray-900 py-24 text-center text-white">
      <h2 className="text-3xl font-semibold">
        Bereit für dein erstes Interview?
      </h2>

      <div className="mt-8">
        <Link
          href="/auth/register"
          className="rounded-md bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400"
        >
          Jetzt starten
        </Link>
      </div>
    </section>
  );
}
