"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SponsorRow } from "@/lib/sponsors";

type SponsorManagerProps = {
  eventId: string;
  isPro: boolean;
  sponsors: SponsorRow[];
};

// Kelola logo sponsor (task 013) — tier Pro; API menolak 403 untuk Free/Basic.
export function SponsorManager({ eventId, isPro, sponsors: initial }: SponsorManagerProps) {
  const [sponsors, setSponsors] = useState<SponsorRow[]>(initial);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<"frame" | "qr">("frame");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPro) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
        <p className="font-display text-xl text-text-primary">
          Sponsor tersedia di paket Pro
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Logo partner di frame foto & kartu QR meja.{" "}
          <Button href="/dashboard/billing" variant="secondary" size="sm" className="mt-3">
            Lihat Paket
          </Button>
        </p>
      </div>
    );
  }

  async function createSponsor() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("position", position);
      if (file) form.set("logo", file);
      const res = await fetch(`/api/events/${eventId}/sponsors`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as { error?: string; id?: string } | null;
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Gagal menyimpan sponsor.");
      setSponsors((prev) => [
        ...prev,
        {
          id: data.id!,
          event_id: eventId,
          name: name.trim(),
          logo_path: null,
          position,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setName("");
      setFile(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(sponsor: SponsorRow) {
    setBusyId(sponsor.id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors/${sponsor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sponsor.is_active }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Gagal memperbarui sponsor.");
      setSponsors((prev) =>
        prev.map((s) => (s.id === sponsor.id ? { ...s, is_active: !s.is_active } : s)),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSponsor(sponsor: SponsorRow) {
    if (!window.confirm(`Hapus sponsor "${sponsor.name}"? Logo ikut terhapus.`)) return;
    setBusyId(sponsor.id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors/${sponsor.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Gagal menghapus sponsor.");
      setSponsors((prev) => prev.filter((s) => s.id !== sponsor.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void createSponsor();
        }}
        className="flex flex-col gap-3 rounded-xl border border-border bg-bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="sponsor-name" className="block text-sm font-medium text-text-primary">
            Nama sponsor
          </label>
          <input
            id="sponsor-name"
            type="text"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
          />
        </div>
        <div>
          <label htmlFor="sponsor-position" className="block text-sm font-medium text-text-primary">
            Posisi
          </label>
          <select
            id="sponsor-position"
            value={position}
            onChange={(e) => setPosition(e.target.value as "frame" | "qr")}
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue sm:w-36"
          >
            <option value="frame">Frame foto</option>
            <option value="qr">Kartu QR</option>
          </select>
        </div>
        <div>
          <label htmlFor="sponsor-logo" className="block text-sm font-medium text-text-primary">
            Logo (PNG/JPEG, ≤2 MB)
          </label>
          <input
            id="sponsor-logo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-bg-warm file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent sm:w-56"
          />
        </div>
        <Button type="submit" disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
          Tambah Sponsor
        </Button>
      </form>

      {sponsors.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
          <p className="font-display text-xl text-text-primary">Belum ada sponsor.</p>
          <p className="mt-1 text-sm text-text-secondary">
            Tambahkan logo partner — muncul di hasil foto tamu & kartu QR meja.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sponsors.map((s) => (
            <li
              key={s.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-card p-4 ${s.is_active ? "" : "opacity-60"}`}
            >
              {s.logo_path ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL publik Storage
                <img
                  src={`${process.env.NEXT_PUBLIC_HOSTINGER_MEDIA_URL ?? ""}/public/${s.logo_path}`}
                  alt={`Logo ${s.name}`}
                  className="h-10 w-10 rounded-lg border border-border bg-bg-warm object-contain p-1"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-warm font-display text-lg text-accent">
                  {s.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
                <p className="text-xs text-text-secondary">
                  {s.position === "frame" ? "Frame foto" : "Kartu QR"} ·{" "}
                  {s.is_active ? "aktif" : "nonaktif"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleActive(s)}
                  disabled={busyId === s.id}
                  aria-label={s.is_active ? "Nonaktifkan sponsor" : "Aktifkan sponsor"}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-warm hover:text-accent disabled:opacity-50"
                >
                  {s.is_active ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSponsor(s)}
                  disabled={busyId === s.id}
                  aria-label="Hapus sponsor"
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-danger/40 text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
