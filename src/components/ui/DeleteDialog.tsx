"use client";

export default function DeleteDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-gray-800 p-6 outline outline-1 outline-white/10">
        <h2 className="text-lg font-semibold text-white">Interview löschen</h2>

        <p className="mt-2 text-sm text-gray-400">
          Bist du sicher, dass du dieses Interview löschen möchtest? Diese
          Aktion kann nicht rückgängig gemacht werden.
        </p>

        {/* ACTIONS */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
          >
            Abbrechen
          </button>

          <button
            onClick={onConfirm}
            className="rounded-md bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-400"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
