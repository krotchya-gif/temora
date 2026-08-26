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

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/admin/events");
    const body = (await res.json()) as { events: EventRow[] };
    setEvents(body.events ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchEvents();
    } finally {
      setLoading(false);
    }
  }, [fetchEvents]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/events")
      .then((res) => res.json())
      .then((body: { events: EventRow[] }) => {
        if (!cancelled) setEvents(body.events ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function retry(id: string) {
    await fetch(`/api/admin/events/${id}/retry`, { method: "POST" });
    await load();
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-text-primary">Event Monitor</h2>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={13} aria-hidden /> Muat Ulang
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-text-secondary">Memuat…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Belum ada event. Event tercatat saat tamu klik WA (landing) / upgrade (pricing) /
          pembayaran sukses (webhook Xendit).
        </p>
      ) : (
        <div className="overflow-x-auto">
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
                      disabled={e.status === "sent"}
                    >
                      Retry
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}