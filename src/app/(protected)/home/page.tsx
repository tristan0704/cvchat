"use client";

function StatCard({
  title,
  value,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="rounded-xl bg-gray-800/50 p-5 outline outline-1 outline-white/10 hover:bg-gray-800/70 transition">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>

        <span
          className={`text-xs font-medium ${
            trendUp ? "text-green-400" : "text-red-400"
          }`}
        >
          {trendUp ? "▲" : "▼"} {trend}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Home</h1>

        <p className="mt-4 text-gray-400">Willkommen bei CareerPitch.</p>

        {/* 🔥 STATS */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Interviews gesamt"
            value="24"
            trend="+12%"
            trendUp={true}
          />

          <StatCard
            title="Abgeschlossen"
            value="18"
            trend="+8%"
            trendUp={true}
          />

          <StatCard title="CV Score" value="82%" trend="+5%" trendUp={true} />

          <StatCard
            title="Erfolgsquote"
            value="75%"
            trend="-3%"
            trendUp={false}
          />
        </div>

        {/* ⚡ QUICK ACTIONS */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 hover:bg-gray-800/70 transition cursor-pointer">
            <p className="text-lg font-semibold">Simulation starten</p>
            <p className="text-sm text-gray-400 mt-2">
              Starte ein neues Interview
            </p>
          </div>

          <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 hover:bg-gray-800/70 transition cursor-pointer">
            <p className="text-lg font-semibold">Ergebnisse ansehen</p>
            <p className="text-sm text-gray-400 mt-2">
              Analysiere deine Performance
            </p>
          </div>

          <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 hover:bg-gray-800/70 transition cursor-pointer">
            <p className="text-lg font-semibold">Profil bearbeiten</p>
            <p className="text-sm text-gray-400 mt-2">
              Aktualisiere deinen Lebenslauf
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
