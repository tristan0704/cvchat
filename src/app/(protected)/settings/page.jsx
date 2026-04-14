"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("de");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="mt-2 text-gray-400">Passe deine App-Erfahrung an</p>

        <div className="mt-8 space-y-6">
          {/* GENERAL */}
          <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 space-y-4">
            <h2 className="text-lg font-semibold">Allgemein</h2>

            {/* LANGUAGE */}

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Sprache
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md bg-gray-900 px-3 py-2 text-white outline outline-1 outline-white/10 focus:outline-indigo-500"
              >
                <option value="de">Deutsch</option>
                <option value="en">Englisch</option>
              </select>
            </div>

            {/* DARK MODE */}
            {/*
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">Dark Mode</p>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  darkMode ? "bg-indigo-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    darkMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            */}
          </div>

          {/* NOTIFICATIONS */}
          <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 space-y-4">
            <h2 className="text-lg font-semibold">Benachrichtigungen</h2>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">Email Benachrichtigungen</p>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  notifications ? "bg-indigo-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    notifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECURITY */}
          {/*
          <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10 space-y-4">
            <h2 className="text-lg font-semibold">Sicherheit</h2>

            <button className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/5">
              Passwort ändern
            </button>

            <button className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/5">
              2FA aktivieren
            </button>
          </div>

          */}

          {/* DANGER ZONE */}
          <div className="rounded-xl bg-red-500/10 p-6 outline outline-1 outline-red-500/20 space-y-4">
            <h2 className="text-lg font-semibold text-red-400">Account</h2>

            <button className="w-full rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30">
              Account löschen
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
