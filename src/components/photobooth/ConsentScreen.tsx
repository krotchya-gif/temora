"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ConsentScreenProps = {
  eventName: string;
  tableLabel: string;
  /** Nama sponsor frame aktif (task 013) — kosong = tidak disebut. */
  sponsorNames: string[];
  onAccept: () => void;
};

// Consent privasi tamu sebelum kamera aktif (design-system §3.7).
export function ConsentScreen({
  eventName,
  tableLabel,
  sponsorNames,
  onAccept,
}: ConsentScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-base bg-glow-accent">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm animate-fade-up rounded-xl border border-border bg-bg-card p-6 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-warm">
            <Camera className="h-5 w-5 text-accent" aria-hidden />
          </span>

          <h1 className="mt-4 font-display text-3xl leading-tight text-text-primary">
            {eventName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{tableLabel}</p>

          {/* Microcopy consent — design-system §6 */}
          <p className="mt-5 text-[15px] leading-relaxed text-text-primary">
            Foto yang kamu ambil tersimpan ke galeri acara dan hanya bisa
            dilihat oleh penyelenggara. Foto otomatis terhapus paling lambat 30
            hari setelah acara berakhir.
          </p>

          {sponsorNames.length > 0 ? (
            <p className="mt-3 rounded-lg bg-bg-warm px-3 py-2 text-xs leading-relaxed text-text-secondary">
              Acara ini didukung oleh {sponsorNames.join(", ")}.
            </p>
          ) : null}

          <Link
            href="/privacy"
            className="mt-3 inline-flex text-xs text-text-secondary underline underline-offset-4 transition-colors hover:text-accent"
          >
            Baca kebijakan privasi
          </Link>

          <Button size="lg" className="mt-6 w-full" onClick={onAccept}>
            Oke, Mengerti
          </Button>
        </div>
      </div>

      <footer className="px-4 pb-8 text-center">
        <p className="font-display text-sm italic tracking-wide text-text-secondary">
          Keep it close. Keep it TEMORA.
        </p>
      </footer>
    </main>
  );
}
