"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type EventRow = {
  id: string;
  event_name: string;
  label: string;
  page: string | null;
  value: Record<string, unknown> | null;
  status: string;
  provider: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  sent: "Terkirim",
  failed: "Gagal",
};

// Tab Event Monitor (referensi seo-admin-reference.md §4.4): 100 event
// konversi marketing terakhir + retry manual.
export function EventsTab() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/admin/events");
    if (!res.ok) throw new Error(`Event gagal dimuat (${res.status}).`);
    const body = (await res.json()) as { events: EventRow[] };
    setEvents(body.events ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await fetchEvents();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Event gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [fetchEvents]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/events")
      .then((res) => {
        if (!res.ok) throw new Error(`Event gagal dimuat (${res.status}).`);
        return res.json();
      })
      .then((body: { events: EventRow[] }) => {
        if (!cancelled) setEvents(body.events ?? []);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Event gagal dimuat.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function retry(id: string) {
    setRetryingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/events/${id}/retry`, { method: "POST" });
      if (!response.ok) throw new Error(`Retry gagal (${response.status}).`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Retry gagal.");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl text-text-primary">Event Monitor</h2>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={13} aria-hidden /> Muat Ulang
        </Button>
      </div>

      {loading ? (
        <div aria-label="Memuat event" className="space-y-2">
          <div className="h-12 animate-pulse rounded-lg bg-bg-warm motion-reduce:animate-none" />
          <div className="h-12 animate-pulse rounded-lg bg-bg-warm motion-reduce:animate-none" />
        </div>
      ) : error && events.length === 0 ? (
        <div role="alert" className="space-y-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <p>{error}</p>
          <Button size="sm" variant="secondary" onClick={load}>Coba Lagi</Button>
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Belum ada event. Event tercatat saat tamu klik WA (landing) / upgrade (pricing) /
          pembayaran sukses (webhook Xendit).
        </p>
      ) : (
        <>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="space-y-3 lg:hidden">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-border bg-bg-warm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-mono text-xs text-text-primary">{event.event_name}</p>
                  <p className="mt-1 text-sm text-text-secondary">{event.label}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${event.status === "sent" ? "bg-success/10 text-success" : event.status === "failed" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                  {STATUS_LABEL[event.status] ?? event.status}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <div><dt>Halaman</dt><dd className="break-all font-mono text-text-primary">{event.page ?? "—"}</dd></div>
                <div><dt>Waktu</dt><dd className="text-text-primary">{new Date(event.created_at).toLocaleString("id-ID")}</dd></div>
              </dl>
              <Button className="mt-3 w-full" size="sm" variant="secondary" onClick={() => retry(event.id)} disabled={event.status === "sent" || retryingId === event.id}>
                {retryingId === event.id ? "Mengulang…" : "Retry"}
              </Button>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Label</th>
                <th className="py-2 pr-3">Halaman</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Waktu</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-mono text-xs text-text-primary">{e.event_name}</td>
                  <td className="py-2 pr-3 text-text-secondary">{e.label}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-text-secondary">{e.page ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        e.status === "sent"
                          ? "bg-success/10 text-success"
                          : e.status === "failed"
                            ? "bg-danger/10 text-danger"
                            : "bg-warning/10 text-warning"
                      }`}
                    >
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-text-secondary">
                    {new Date(e.created_at).toLocaleString("id-ID")}
                  </td>
                  <td className="py-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => retry(e.id)}
                      disabled={e.status === "sent" || retryingId === e.id}
                    >
                      {retryingId === e.id ? "Mengulang…" : "Retry"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Card>
  );
}
