"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

type QrTable = { id: string; label: string };

type QrManagerProps = {
  eventId: string;
  tables: QrTable[];
};

export function QrManager({ eventId, tables }: QrManagerProps) {
  const router = useRouter();
  const [count, setCount] = useState("8");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function call(body: Record<string, unknown>) {
    const res = await fetch(`/api/events/${eventId}/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan. Coba sekali lagi ya.");
  }

  function afterMutation() {
    startTransition(() => router.refresh());
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await call({ count: Number(count) });
      afterMutation();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function handleRegenerate(tableId: string) {
    if (
      !window.confirm(
        "Ganti QR meja ini? QR lama tidak berlaku dan kartu perlu dicetak ulang.",
      )
    ) {
      return;
    }
    setPendingId(tableId);
    setMessage(null);
    try {
      await call({ regenerateTableId: tableId });
      afterMutation();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  const busy = isPending || pendingId !== null;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleGenerate}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div>
          <label
            htmlFor="table-count"
            className="block text-sm font-medium text-text-primary"
          >
            Jumlah meja baru
          </label>
          <input
            id="table-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue sm:w-32"
          />
        </div>
        <Button type="submit" disabled={busy}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Buat Meja &amp; QR
        </Button>
      </form>

      {message ? (
        <p
          role="status"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-text-primary"
        >
          {message}
        </p>
      ) : null}

      {tables.length === 0 ? (
        <p className="rounded-xl border border-border bg-bg-card px-6 py-10 text-center text-sm leading-relaxed text-text-secondary">
          Belum ada meja. Tentukan jumlahnya dulu, lalu cetak kartu QR-nya.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <li key={table.id}>
              <figure className="flex flex-col items-center gap-2 rounded-xl border border-border bg-bg-card p-4 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG dari API sendiri */}
                <img
                  src={`/api/events/${eventId}/qr/${table.id}`}
                  alt={`QR ${table.label}`}
                  width={140}
                  height={140}
                  loading="lazy"
                  className="h-[140px] w-[140px]"
                />
                <figcaption className="text-sm font-medium text-text-primary">
                  {table.label}
                </figcaption>
                <button
                  type="button"
                  onClick={() => void handleRegenerate(table.id)}
                  disabled={busy}
                  aria-label={`Ganti QR untuk ${table.label}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-warm hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${pendingId === table.id ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  Ganti QR
                </button>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
