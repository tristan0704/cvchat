export default function InterviewsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Lernen</h1>

        <p className="mt-4 text-gray-400">Willkommen bei CareerPitch.</p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl bg-gray-800 p-6">Simulation starten</div>
          <div className="rounded-xl bg-gray-800 p-6">Ergebnisse ansehen</div>
          <div className="rounded-xl bg-gray-800 p-6">Profil bearbeiten</div>
        </div>
      </main>
    </div>
  );
}
