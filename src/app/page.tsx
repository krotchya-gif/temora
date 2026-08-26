import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Download, QrCode } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { RopeMoments } from "@/components/marketing/RopeMoments";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getWhatsAppUrl, HOW_IT_WORKS_STEPS } from "@/lib/constants";
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-glow-accent" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="animate-fade-up space-y-6">
            <h1 className="font-display text-5xl leading-[1.06] text-text-primary sm:text-6xl lg:text-[4rem]">
              Keep The Moments Close.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-text-secondary">
              A virtual photobooth made for the people, laughter, and little
              moments worth remembering.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button href={getWhatsAppUrl()} size="lg">
                Mulai via WhatsApp
              </Button>
              <Button href="/how-it-works" variant="secondary" size="lg">
                Lihat Cara Kerja
              </Button>
            </div>
          </div>

          {/* Polaroid signature (design-system §3.4) */}
          <div
            className="animate-fade-up lg:justify-self-end"
            style={{ animationDelay: "120ms" }}
          >
            <figure className="group relative w-full max-w-sm rotate-2 rounded-md bg-bg-card p-3 pb-14 shadow-card transition-transform duration-300 hover:rotate-0 motion-reduce:transition-none sm:max-w-md">
              <div className="overflow-hidden rounded-sm">
                <Image
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&h=1000&q=80"
                  alt="Tamu acara tertawa bersama saat foto candid"
                  width={800}
                  height={1000}
                  priority
                  className="animate-develop aspect-[4/5] w-full object-cover"
                />
              </div>
              <figcaption className="absolute inset-x-0 bottom-4 text-center">
                <span className="font-display text-xl italic text-text-primary">
                  142 momen terkumpul
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

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
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
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
            <div className="relative min-h-[220px] bg-bg-warm lg:min-h-full">
              <Image
                src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80"
                alt="Meja tamu dengan dekorasi hangat di acara pernikahan"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Card>
      </section>
    </MarketingLayout>
  );
}
