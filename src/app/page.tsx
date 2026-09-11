import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, Download, QrCode } from "lucide-react";
import { BrandHero } from "@/components/marketing/BrandHero";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { RopeMoments } from "@/components/marketing/RopeMoments";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HOW_IT_WORKS_STEPS } from "@/lib/constants";
import { momentImageUrl, type MomentCard } from "@/lib/moments";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "TEMORA — Virtual Photobooth for Every Moment",
  description:
    "Capture the moments that matter with TEMORA, a virtual photobooth experience for weddings, birthdays, gatherings, and special events.",
};

const stepIcons = {
  qr: QrCode,
  camera: Camera,
  gallery: Download,
} as const;

const valueProps = [
  {
    title: "Tanpa install app",
    copy: "Tamu scan QR dari meja, langsung buka kamera browser HP.",
  },
  {
    title: "Frame kustom acara",
    copy: "Upload frame PNG transparan agar branding wedding atau corporate tetap konsisten.",
  },
  {
    title: "Galeri + ZIP",
    copy: "Vendor lihat foto real-time dan unduh semua momen sekaligus.",
  },
];

export default async function HomePage() {
  // 24 momen kurasi terbaru untuk rope (showcase moments).
  const supabase = await createClient();
  const { data: showcase } = await supabase
    .from("showcase_photos")
    .select("id, storage_path, external_url, title, caption")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(24);

  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ropeItems: MomentCard[] = (showcase ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    caption: row.caption,
    url: momentImageUrl(row, publicBase),
  }));

  return (
    <MarketingLayout>
      <BrandHero />

      {/* Value strip */}
      <section className="border-y border-border bg-bg-warm">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border lg:px-8">
          {valueProps.map((item, index) => (
            <div
              key={item.title}
              className={`space-y-2 md:px-8 ${index === 0 ? "md:pl-0" : ""} ${
                index === valueProps.length - 1 ? "md:pr-0" : ""
              }`}
            >
              <h2 className="font-display text-xl text-text-primary">{item.title}</h2>
              <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works preview */}
      <section id="cara-kerja" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <h2 className="max-w-md font-display text-3xl leading-tight text-text-primary sm:text-4xl">
          Tiga langkah, momen terabadikan
        </h2>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const Icon = stepIcons[step.icon];
            return (
              <div
                key={step.step}
                className={`max-w-sm space-y-4 ${
                  index === 1 ? "md:mt-10" : index === 2 ? "md:mt-20" : ""
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-warm">
                  <Icon className="h-5 w-5 text-accent" aria-hidden />
                </span>
                <h3 className="font-display text-2xl text-text-primary">{step.title}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <Link
          href="/how-it-works"
          className="mt-14 inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Pelajari lebih lanjut
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      {/* Tali Momen — kurasi platform (design-system §5) */}
      <RopeMoments items={ropeItems} />

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <Card className="overflow-hidden bg-bg-card p-0">
          <div className="grid lg:grid-cols-2">
            <div className="space-y-5 p-8 sm:p-10">
              <h2 className="font-display text-3xl leading-tight text-text-primary sm:text-4xl">
                Siap untuk acara berikutnya?
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-text-secondary sm:text-base">
                Daftar gratis atau hubungi tim TEMORA via WhatsApp untuk aktivasi
                akun vendor kamu.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button href="/signup" size="lg">
                  Mulai Gratis
                </Button>
                <Button href="/pricing" variant="secondary" size="lg">
                  Lihat Harga
                </Button>
              </div>
            </div>
            <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden bg-bg-warm p-8 lg:min-h-full">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-accent-secondary/30" aria-hidden />
              <div className="relative w-full max-w-[250px] rotate-2 rounded-2xl border border-border bg-bg-card p-5 shadow-card transition-transform duration-300 hover:rotate-0 motion-reduce:transition-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">Scan &amp; jepret</p>
                    <p className="mt-2 font-display text-2xl leading-none text-text-primary">party dirumah</p>
                    <p className="mt-1 text-[10px] text-text-secondary">Setiap tamu punya satu cerita.</p>
                  </div>
                  <QrCode className="h-12 w-12 text-text-primary" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-3 text-[10px] text-text-secondary">
                  <span>Tanpa install app</span>
                  <span className="font-mono text-accent">TEMORA</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </MarketingLayout>
  );
}
