"use client";

import { useState } from "react";

export default function ProfilePage() {
  const [username, setUsername] = useState("maxmustermann");
  const [email, setEmail] = useState("max@mail.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [file, setFile] = useState(null);

  const [currentCV, setCurrentCV] = useState({
    name: "lebenslauf.pdf",
    url: "/cv.pdf", // später von Backend
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="mt-2 text-gray-400">Verwalte deine persönlichen Daten</p>

        <div className="mt-8 space-y-6 rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
          {/* PROFILE IMAGE */}
          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"
              className="h-16 w-16 rounded-full object-cover"
              alt="Profilbild"
            />
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Profilbild
              </label>
              <input
                type="file"
                className="text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1 file:text-white hover:file:bg-indigo-400"
              />
            </div>
          </div>

          {/* USERNAME */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Benutzername
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Neues Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Passwort wiederholen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
            />
          </div>

          {/* CV SECTION */}
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Lebenslauf</p>

            {/* CURRENT CV */}
            {currentCV && (
              <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3 outline outline-1 outline-white/10">
                <div>
                  <p className="text-sm text-white font-medium">
                    {currentCV.name}
                  </p>
                  <p className="text-xs text-gray-400">Bereits hochgeladen</p>
                </div>

                <a
                  href={currentCV.url}
                  target="_blank"
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Ansehen
                </a>
              </div>
            )}

            {/* UPLOAD */}
            <div className="border border-dashed border-white/20 rounded-lg p-6 text-center">
              <p className="mb-3 text-sm text-gray-400">
                Neuen Lebenslauf hochladen
              </p>

              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="cv-upload"
              />

              <label
                htmlFor="cv-upload"
                className="cursor-pointer rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
              >
                Datei auswählen
              </label>

              {file && (
                <p className="mt-3 text-xs text-gray-300">{file.name}</p>
              )}
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="flex justify-end">
            <button className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition">
              Änderungen speichern
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
