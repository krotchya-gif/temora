"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Power, Trash2 } from "lucide-react";

type EventStatusControlsProps = {
  eventId: string;
  isActive: boolean;
  /** Teks konfirmasi hapus — menyebut konsekuensi (foto ikut terhapus). */
};

export function EventStatusControls({ eventId, isActive }: EventStatusControlsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setBusy("toggle");
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Gagal mengubah status event.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteEvent() {
    if (
      !window.confirm(
        "Hapus event ini beserta semua momen dan kartu QR-nya? Tindakan ini tidak bisa dibatalkan.",
      )
    ) {
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Gagal menghapus event.");
      router.push("/dashboard/events");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void toggleActive()}
          disabled={busy !== null}
          aria-label={isActive ? "Nonaktifkan event" : "Aktifkan event"}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent/30 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:opacity-50"
        >
          <Power className="h-4 w-4" aria-hidden />
          {isActive ? "Nonaktifkan" : "Aktifkan"}
        </button>

        <button
          type="button"
          onClick={() => void deleteEvent()}
          disabled={busy !== null}
          aria-label="Hapus event"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Hapus Event
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-text-primary"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
