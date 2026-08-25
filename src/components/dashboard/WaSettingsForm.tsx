"use client";

import { useState } from "react";

type WaSettingsFormProps = {
  phone: string;
  waOptIn: boolean;
};

// Nomor + opt-in notifikasi WhatsApp (task 009 §2).
export function WaSettingsForm({ phone, waOptIn }: WaSettingsFormProps) {
  const [value, setValue] = useState(phone);
  const [optIn, setOptIn] = useState(waOptIn);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/wa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value, waOptIn: optIn }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan pengaturan.");
      setMessage({ ok: true, text: "Pengaturan notifikasi tersimpan ✨" });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="wa-phone" className="block text-sm font-medium text-text-primary">
          Nomor WhatsApp
        </label>
        <input
          id="wa-phone"
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="081234567890"
          className="mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
        />
        <p className="mt-1 text-xs text-text-secondary">
          Otomatis dinormalkan ke format 62… · dipakai untuk info event &amp; pembayaran.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-[color:var(--color-accent)]"
        />
        <span>Terima notifikasi WhatsApp tentang event dan pembayaran.</span>
      </label>

      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs leading-relaxed text-text-primary"
              : "rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-text-primary"
          }
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
      >
        {busy ? "Menyimpan…" : "Simpan Pengaturan"}
      </button>
    </form>
  );
}
