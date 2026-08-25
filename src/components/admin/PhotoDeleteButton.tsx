"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PhotoDeleteButtonProps = {
  eventId: string;
  photoId: string;
};

export function PhotoDeleteButton({ eventId, photoId }: PhotoDeleteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (
      !window.confirm(
        "Sembunyikan foto ini dari galeri vendor? Foto bisa di-purge permanen oleh cron TTL.",
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/events/${eventId}/photos/${photoId}`, {
      method: "DELETE",
    });
    setBusy(false);

    if (res.ok) router.refresh();
    else window.alert("Gagal menghapus foto. Coba lagi.");
  }

  return (
    <button
      type="button"
      onClick={() => void remove()}
      disabled={busy}
      aria-label="Hapus foto"
      className="min-h-9 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:opacity-50"
    >
      {busy ? "…" : "Hapus"}
    </button>
  );
}
