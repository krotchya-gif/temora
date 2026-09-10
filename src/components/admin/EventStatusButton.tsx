"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EventStatusButtonProps = {
  eventId: string;
  eventName: string;
  isActive: boolean;
};

export function EventStatusButton({
  eventId,
  eventName,
  isActive,
}: EventStatusButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !isActive;
    const confirmed = window.confirm(
      next
        ? `Aktifkan kembali "${eventName}"? Tamu bisa mengakses lagi selama belum expired.`
        : `Nonaktifkan "${eventName}"? Tamu langsung tidak bisa upload foto.`,
    );
    if (!confirmed) return;

    setBusy(true);
    const res = await fetch(`/api/admin/events/${eventId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setBusy(false);

    if (res.ok) router.refresh();
    else window.alert("Gagal mengubah status. Coba lagi.");
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={`min-h-11 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:opacity-50 ${
        isActive
          ? "border border-danger/40 text-danger hover:bg-danger/10"
          : "border border-success/40 text-success hover:bg-success/10"
      }`}
    >
      {busy ? "…" : isActive ? "Nonaktifkan" : "Aktifkan"}
    </button>
  );
}
