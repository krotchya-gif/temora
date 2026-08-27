"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MomentRow } from "@/lib/validation/moments";
import { cn } from "@/lib/utils";
import {
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

type MomentsFeedProps = {
  eventId: string;
};

// Feed moments realtime (task 012): subscribe INSERT + moderasi hide/show.
export function MomentsFeed({ eventId }: MomentsFeedProps) {
  const [moments, setMoments] = useState<MomentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/moments`);
      const data = (await res.json().catch(() => null)) as {
        moments?: MomentRow[];
        error?: string;
      } | null;
      if (!res.ok || !data) throw new Error(data?.error ?? "Gagal memuat momen.");
      setMoments(data.moments ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    // Defer — hindari setState sinkron dalam effect (pola React Compiler).
    const timer = setTimeout(() => void load(), 0);

    const channel = supabase
      .channel(`moments:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moments",
          filter: `event_id=eq.${eventId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [eventId, load, supabase]);

  async function toggleHide(momentId: string, isHidden: boolean) {
    setBusyId(momentId);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/moments/${momentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !isHidden }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Gagal memperbarui momen.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // Export CSV (task 012 AC #7) — hanya momen tidak tersembunyi.
  function exportCsv() {
    const visible = moments.filter((m) => !m.is_hidden);
    const rows = [
      ["id", "waktu", "meja", "foto", "isi"],
      ...visible.map((m) => [
        m.id,
        new Date(m.created_at).toISOString(),
        m.table_id ?? "",
        m.photo_id ? "ada" : "",
        `"${m.content.replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `momen-${eventId}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Memuat momen…
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
        <p className="font-display text-xl text-text-primary">Belum ada momen.</p>
        <p className="mt-1 text-sm text-text-secondary">
          Bagikan QR code-nya dulu, ya — tamu bisa menuliskan apa yang mereka rasakan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          {moments.length} momen · yang tersembunyi tidak ikut export
        </p>
        <button
          type="button"
          onClick={exportCsv}
          disabled={moments.filter((m) => !m.is_hidden).length === 0}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent/30 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Unduh CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {moments.map((m) => (
          <article
            key={m.id}
            className={cn(
              "relative flex flex-col gap-2 rounded-xl border border-border bg-bg-card p-4 shadow-xs transition-opacity",
              m.is_hidden && "opacity-60",
            )}
          >
            {m.is_hidden ? (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                <EyeOff className="h-3 w-3" aria-hidden />
                Disembunyikan
              </span>
            ) : null}

            {m.photo_id ? (
              <span className="inline-flex h-24 w-full items-center justify-center rounded-lg bg-bg-warm">
                <ImageIcon className="h-6 w-6 text-text-secondary/50" aria-hidden />
              </span>
            ) : (
              <span className="inline-flex h-24 w-full items-center justify-center rounded-lg bg-bg-warm">
                <span className="font-display text-2xl text-accent-secondary">“</span>
              </span>
            )}

            <blockquote className="line-clamp-4 text-sm leading-relaxed text-text-primary">
              {m.content}
            </blockquote>

            <div className="mt-auto flex items-center justify-between gap-2">
              <time className="text-[11px] text-text-secondary">
                {new Date(m.created_at).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <button
                type="button"
                onClick={() => void toggleHide(m.id, m.is_hidden)}
                disabled={busyId === m.id}
                aria-label={m.is_hidden ? "Tampilkan momen" : "Sembunyikan momen"}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-warm hover:text-accent disabled:opacity-50"
              >
                {m.is_hidden ? (
                  <Eye className="h-4 w-4" aria-hidden />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}