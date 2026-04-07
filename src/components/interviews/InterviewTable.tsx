"use client";

import Link from "next/link";
import { useState } from "react";
import DeleteDialog from "@/components/ui/DeleteDialog";

type Status = "abgeschlossen" | "laufend" | "ausstehend";

const data = [
  {
    id: 1,
    typ: "Frontend Interview",
    gestartet: "05.04.2026",
    status: "laufend" as Status,
  },
  {
    id: 2,
    typ: "Backend Interview",
    gestartet: "04.04.2026",
    status: "abgeschlossen" as Status,
  },
  {
    id: 3,
    typ: "System Design",
    gestartet: "03.04.2026",
    status: "ausstehend" as Status,
  },
];

function getStatusStyle(status: Status) {
  switch (status) {
    case "abgeschlossen":
      return "bg-green-500/10 text-green-400 ring-green-500/20";
    case "laufend":
      return "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20";
    case "ausstehend":
      return "bg-gray-500/10 text-gray-400 ring-gray-500/20";
  }
}

export default function InterviewTable() {
  // ✅ HIER rein!
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="rounded-xl bg-gray-800/50 p-6 outline outline-1 outline-white/10">
      <h2 className="text-lg font-semibold text-white mb-4">Interviews</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Typ</th>
              <th className="px-4 py-3 text-left">Gestartet am</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-white/5 transition">
                <td className="px-4 py-3 text-gray-300">{item.id}</td>

                <td className="px-4 py-3 text-white font-medium">{item.typ}</td>

                <td className="px-4 py-3 text-gray-400">{item.gestartet}</td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-right flex justify-end gap-2">
                  <Link
                    href={`/interviews/${item.id}`}
                    className="rounded-md bg-indigo-500/10 px-3 py-1 text-xs text-indigo-400 hover:bg-indigo-500/20"
                  >
                    Öffnen
                  </Link>

                  <button
                    onClick={() => {
                      setSelectedId(item.id);
                      setOpen(true);
                    }}
                    className="rounded-md bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          console.log("delete", selectedId);
          setOpen(false);
        }}
      />
    </div>
  );
}
