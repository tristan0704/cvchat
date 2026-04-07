"use client";

import { useState } from "react";

export default function RegisterStep2() {
  const [file, setFile] = useState(null);

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-900">
      {/* HEADER */}
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
          className="mx-auto h-10 w-auto"
          alt="Logo"
        />

        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-white">
          Profil vervollständigen
        </h2>

        <p className="mt-2 text-center text-sm text-gray-400">
          Benutzername wählen und Lebenslauf hochladen
        </p>
      </div>

      {/* FORM */}
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6">
          {/* USERNAME */}
          <div>
            <label className="block text-sm font-medium text-gray-100">
              Benutzername
            </label>

            <div className="mt-2">
              <input
                type="text"
                placeholder="deinusername"
                className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-white outline outline-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* CV UPLOAD */}
          <div className="border border-dashed border-white/20 rounded-lg p-6 text-center">
            <p className="mb-3 text-sm text-gray-400">Lebenslauf hochladen</p>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
              id="cv-upload"
            />

            <label
              htmlFor="cv-upload"
              className="cursor-pointer rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Datei auswählen
            </label>

            {file && <p className="mt-3 text-xs text-gray-300">{file.name}</p>}
          </div>

          {/* BUTTONS */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex w-full items-center justify-center rounded-md border border-white/10 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5"
            >
              Zurück
            </button>

            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-md bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Fertig
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
