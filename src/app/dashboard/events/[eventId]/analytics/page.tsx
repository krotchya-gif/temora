import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { BarChart3, Camera, Heart, ScanLine } from "lucide-react";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analitik",
};

type AnalyticsPageProps = {
  params: Promise<{ eventId: string }>;
};

// Agregat murni SQL + cache 60 detik (database.md §10.5). Tidak ada data
// personal tamu — hanya hitungan & agregat (task 014 AC #4).
// Client dipakai di dalam cache = service role (tanpa cookies); kepemilikan
// event sudah divalidasi via sesi di luar cache.
const getStats = unstable_cache(
  async (eventId: string) => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const [photoCount, savedCount, scanCount, momentCount, tableCount, photos] =
      await Promise.all([
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .is("deleted_at", null),
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .is("deleted_at", null)
          .not("guest_saved_at", "is", null),
        supabase
          .from("tables")
          .select("scan_count")
          .eq("event_id", eventId),
        supabase
          .from("moments")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("is_hidden", false),
        supabase
          .from("tables")
          .select("id, label, scan_count")
          .eq("event_id", eventId)
          .order("label", { ascending: true }),
        supabase
          .from("photos")
          .select("table_id, taken_at")
          .eq("event_id", eventId)
          .is("deleted_at", null),
      ]);

    // Per meja: foto (id) + scan count.
    const perTable = (tableCount.data ?? []).map((t) => ({
      label: t.label,
      scan: t.scan_count ?? 0,
      photos: 0,
    }));
    const tableIndex = new Map(perTable.map((t, i) => [t.label, i]));
    for (const p of photos.data ?? []) {
      const row = (tableCount.data ?? []).find((t) => t.id === p.table_id);
      if (row) {
        const idx = tableIndex.get(row.label);
        if (idx !== undefined) perTable[idx].photos += 1;
      }
    }

    // Heatmap jam (waktu lokal device server — agregat, bukan data personal).
    const hourly = new Array(24).fill(0);
    for (const p of photos.data ?? []) {
      if (p.taken_at) {
        const hour = new Date(p.taken_at).getHours();
        hourly[hour] += 1;
      }
    }

    return {
      photoCount: photoCount.count ?? 0,
      savedCount: savedCount.count ?? 0,
      scanCount: (scanCount.data ?? []).reduce((a, t) => a + (t.scan_count ?? 0), 0),
      momentCount: momentCount.count ?? 0,
      perTable,
      hourly,
    };
  },
  ["event-analytics"],
  { revalidate: 60 },
);

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const stats = await getStats(eventId);
  const maxPhotos = Math.max(1, ...stats.perTable.map((t) => t.photos));
  const maxHour = Math.max(1, ...stats.hourly);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/events"
        className="inline-flex text-sm text-text-secondary transition-colors hover:text-accent"
      >
        ← Semua event
      </Link>

      <div className="space-y-1.5">
        <h1 className="font-display text-3xl leading-tight text-text-primary">
          Analitik
        </h1>
        <p className="flex items-center gap-2 text-sm text-text-secondary print:hidden">
          <BarChart3 className="h-4 w-4" aria-hidden />
          Ringkasan momen {event.name} — diperbarui maksimal tiap 60 detik.
        </p>
      </div>

      <div className="no-print flex items-center justify-end print:hidden">
        <PrintButton />
      </div>

      <EventSubNav eventId={eventId} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:grid-cols-4">
        {[
          { icon: Camera, label: "Foto", value: stats.photoCount },
          { icon: Heart, label: "Disimpan tamu", value: stats.savedCount },
          { icon: ScanLine, label: "Scan QR", value: stats.scanCount },
          { icon: Camera, label: "Momen", value: stats.momentCount },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-bg-card p-4 shadow-xs"
          >
            <card.icon className="h-4 w-4 text-accent" aria-hidden />
            <p className="mt-2 font-display text-3xl text-text-primary">
              {card.value.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-text-secondary">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1 print:gap-4">
        {/* Foto per meja (bar CSS — tanpa dependency chart, design-system §3.11) */}
        <section className="rounded-xl border border-border bg-bg-card p-5 shadow-xs">
          <h2 className="font-display text-lg text-text-primary">Foto per Meja</h2>
          <ul className="mt-4 space-y-2.5">
            {stats.perTable.map((t) => (
              <li key={t.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-xs font-medium text-text-secondary">
                  {t.label}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-warm">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(3, (t.photos / maxPhotos) * 100)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-xs text-text-primary">
                  {t.photos}
                </span>
              </li>
            ))}
            {stats.perTable.length === 0 ? (
              <li className="text-sm text-text-secondary">Belum ada meja.</li>
            ) : null}
          </ul>
        </section>

        {/* Heatmap jam (24 kolom, intensitas accent — design-system §3.11) */}
        <section className="rounded-xl border border-border bg-bg-card p-5 shadow-xs">
          <h2 className="font-display text-lg text-text-primary">Jam Terpadat</h2>
          <div className="mt-4 grid grid-cols-24 gap-1">
            {stats.hourly.map((count, hour) => (
              <div key={hour} className="flex flex-col items-center gap-1">
                <div
                  title={`${String(hour).padStart(2, "0")}:00 — ${count} foto`}
                  className="w-full rounded-sm bg-accent"
                  style={{
                    height: `${Math.max(4, (count / maxHour) * 56)}px`,
                    opacity: count === 0 ? 0.08 : 0.25 + (count / maxHour) * 0.75,
                  }}
                />
                <span className="text-[9px] text-text-secondary">
                  {String(hour).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-text-secondary">
            Hover tiap bar untuk jumlah foto pada jam tersebut.
          </p>
        </section>
      </div>
    </div>
  );
}