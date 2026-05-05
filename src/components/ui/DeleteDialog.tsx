"use client";

import { useI18n } from "@/lib/i18n/context";

export default function DeleteDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { dictionary } = useI18n();
  const labels = dictionary.interviews;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-gray-800 p-6 outline outline-1 outline-white/10">
        <h2 className="text-lg font-semibold text-white">{labels.deleteTitle}</h2>

        <p className="mt-2 text-sm text-gray-400">
          {labels.deleteDescription}
        </p>

        {/* ACTIONS */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
          >
            {dictionary.common.cancel}
          </button>

          <button
            onClick={onConfirm}
            className="rounded-md bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-400"
          >
            {labels.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
