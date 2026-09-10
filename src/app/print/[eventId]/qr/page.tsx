import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { SITE_TAGLINE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cetak Kartu Meja",
  robots: { index: false },
};

type PrintQrPageProps = {
  params: Promise<{ eventId: string }>;
};

// Halaman cetak A4 — hanya owner event (task 005 acceptance: non-owner ditolak).
export default async function PrintQrPage({ params }: PrintQrPageProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  // Sponsor posisi kartu QR (task 013) — logo kecil di pojok kartu.
  const { data: qrSponsors } = await supabase
    .from("sponsors")
    .select("name, logo_path")
    .eq("event_id", eventId)
    .eq("position", "qr")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(2);

  return (
    <div className="min-h-dvh bg-bg-warm py-8 print:min-h-0 print:bg-white print:py-0">
      <div className="mx-auto max-w-[186mm] px-4 print:max-w-none print:p-0">
        <div className="no-print mb-6 flex items-center justify-between rounded-xl border border-border bg-bg-card p-4 shadow-soft">
          <div>
            <p className="font-display text-lg text-text-primary">
              Kartu meja — {event.name}
            </p>
            <p className="text-sm text-text-secondary">
              {tables?.length ?? 0} kartu · kertas A4 · potong mengikuti garis
              kartu.
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Grid 2×4 per halaman A4 (task 005 §2). */}
        <ul className="qr-print-grid">
          {tables?.map((table) => (
            <li key={table.id} className="qr-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG dari API sendiri */}
              <img
                src={`/api/events/${eventId}/qr/${table.id}`}
                alt={`QR untuk ${table.label}`}
                className="qr-card-image"
              />
              <p className="qr-card-event font-display">{event.name}</p>
              <p className="qr-card-label">{table.label}</p>
              <p className="qr-card-tagline font-display">
                {SITE_TAGLINE}
              </p>
              {qrSponsors?.length ? (
                <div className="qr-card-sponsors">
                  {qrSponsors.map((s) =>
                    s.logo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL publik Storage
                      <img
                        key={s.logo_path}
                        src={`${process.env.HOSTINGER_MEDIA_URL ?? ""}/public/${s.logo_path}`}
                        alt={s.name}
                        className="qr-card-sponsor-logo"
                      />
                    ) : (
                      <span key={s.name} className="qr-card-sponsor-name">
                        {s.name}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {tables?.length === 0 ? (
          <p className="no-print rounded-xl border border-border bg-bg-card px-6 py-10 text-center text-sm text-text-secondary">
            Belum ada meja untuk dicetak. Buat meja dulu di dashboard.
          </p>
        ) : null}
      </div>
    </div>
  );
}
