import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, Images } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/Button";
import { MomentsGrid } from "@/components/marketing/MomentsGrid";
import { getWhatsAppUrl } from "@/lib/constants";
import { momentImageUrl, type MomentCard } from "@/lib/moments";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Moments — TEMORA",
  description:
    "Galeri momen terkurasi dari acara-acara yang memakai TEMORA virtual photobooth.",
};

export default async function MomentsPage() {
  const supabase = await createClient();
  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const { data } = await supabase
    .from("showcase_photos")
    .select("id, storage_path, external_url, title, caption")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const items: MomentCard[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    caption: row.caption,
    url: momentImageUrl(row, publicBase),
  }));

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-glow-accent" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pb-14 lg:pt-24">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Momen pilihan TEMORA</p>
              <h1 className="max-w-2xl font-display text-5xl leading-[0.98] text-text-primary sm:text-6xl lg:text-7xl">
                Yang kecil-kecil, justru paling ingin diingat.
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-text-secondary sm:text-base">
                Kurasi momen favorit dari acara yang memakai TEMORA—tawa, pelukan,
                dan cerita kecil yang tidak sengaja tertangkap kamera.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                {items.length > 0 ? `${items.length} momen dikurasi` : "Kurasi pertama segera hadir"}
              </p>
              <Button href={getWhatsAppUrl("Halo! Saya ingin coba TEMORA untuk acara saya.")} size="sm" variant="secondary">
                Buat momenmu <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-2 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-2"><Camera className="h-3.5 w-3.5 text-accent" aria-hidden /> Tamu jadi fotografer dadakan</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-2"><Images className="h-3.5 w-3.5 text-accent" aria-hidden /> Galeri yang terasa hidup</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">

        <div className="mt-10">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-bg-warm px-6 py-14 text-center sm:px-10 sm:py-16">
              <div className="relative mx-auto mb-8 h-24 w-32" aria-hidden>
                <div className="absolute left-4 top-2 h-20 w-24 -rotate-6 rounded-lg border border-border bg-bg-card p-2 shadow-soft">
                  <div className="flex h-full items-center justify-center rounded bg-muted-mauve/15 text-muted-mauve"><Camera className="h-7 w-7" strokeWidth={1.4} /></div>
                </div>
                <div className="absolute left-8 top-0 h-20 w-24 rotate-6 rounded-lg border border-border bg-bg-card p-2 shadow-card">
                  <div className="flex h-full items-center justify-center rounded bg-dusty-blue/15 text-dusty-blue"><Images className="h-7 w-7" strokeWidth={1.4} /></div>
                </div>
              </div>
              <p className="font-display text-2xl text-text-primary">
                Belum ada momen yang terabadikan.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
                Kurasi pertama sedang disiapkan tim TEMORA. Nantikan segera.
              </p>
            </div>
          ) : (
            <MomentsGrid items={items} />
          )}
        </div>

        <Link
          href="/how-it-works"
          className="mt-12 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        >
          Tahu bagaimana momen ini tercipta
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </MarketingLayout>
  );
}
