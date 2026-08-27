import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { SITE_TAGLINE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cetak Laporan Momen",
  robots: { index: false },
};

type PrintMomentsPageProps = {
  params: Promise<{ eventId: string }>;
};

// Laporan momen A4 (task 012 AC #7 — PDF via print browser). Hanya momen
// TIDAK tersembunyi (moderasi vendor dihormati). Owner session saja.
export default async function PrintMomentsPage({ params }: PrintMomentsPageProps) {
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

  const { data: moments } = await supabase
    .from("moments")
    .select("id, table_id, content, created_at")
    .eq("event_id", eventId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label")
    .eq("event_id", eventId);

  const tableLabel = new Map((tables ?? []).map((t) => [t.id, t.label]));

  return (
    <div className="min-h-dvh bg-bg-warm py-8 print:min-h-0 print:bg-white print:py-0">
      <div className="mx-auto max-w-[186mm] px-4 print:max-w-none print:p-0">
        <div className="no-print mb-6 flex items-center justify-between rounded-xl border border-border bg-bg-card p-4 shadow-soft">
          <div>
            <p className="font-display text-lg text-text-primary">
              Laporan momen — {event.name}
            </p>
            <p className="text-sm text-text-secondary">
              {moments?.length ?? 0} momen · yang disembunyikan tidak ikut
              tercetak · kertas A4.
            </p>
          </div>
          <PrintButton />
        </div>

        <article className="moment-report">
          <header className="moment-report-header">
            <h1 className="font-display text-2xl text-text-primary">
              Momen {event.name}
            </h1>
            <p className="text-sm text-text-secondary">
              Dicetak {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {moments?.length ?? 0} momen · {SITE_TAGLINE}
            </p>
          </header>

          {moments?.length ? (
            <ul className="moment-report-list">
              {moments.map((m, i) => (
                <li key={m.id} className="moment-report-item">
                  <span className="moment-report-index">{i + 1}</span>
                  <blockquote className="moment-report-content">
                    {m.content}
                  </blockquote>
                  <footer className="moment-report-meta">
                    {tableLabel.get(m.table_id ?? "") ?? "—"} ·{" "}
                    {new Date(m.created_at).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </footer>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-text-secondary">
              Belum ada momen untuk dicetak.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}