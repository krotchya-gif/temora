import type { Metadata } from "next";
import Image from "next/image";
import { Camera, Download, QrCode } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getWhatsAppUrl, HOW_IT_WORKS_STEPS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Cara Kerja",
  description:
    "Cara TEMORA virtual photobooth bekerja: tamu scan QR, ambil foto, vendor kelola galeri.",
};

const stepIcons = {
  qr: QrCode,
  camera: Camera,
  gallery: Download,
} as const;

const stepImages = [
  "https://images.unsplash.com/photo-1601004896844-dff2b9a3f0a8?auto=format&fit=crop&w=900&h=650&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&h=500&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&h=500&q=80",
];

export default function HowItWorksPage() {
  const [firstStep, ...restSteps] = HOW_IT_WORKS_STEPS;
  const FirstIcon = stepIcons[firstStep.icon];

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl leading-tight text-text-primary sm:text-5xl">
            How TEMORA Virtual Photobooth Works
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Dari scan QR di meja tamu sampai ZIP foto siap unduh, semua lewat
            browser dan mobile-first.
          </p>
        </div>

        {/* Langkah pertama: band lebar */}
        <div className="mt-14 grid gap-8 rounded-2xl bg-bg-warm p-6 sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12">
          <div className="space-y-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-card shadow-soft">
              <FirstIcon className="h-5 w-5 text-accent" aria-hidden />
            </span>
            <h2 className="font-display text-3xl text-text-primary sm:text-4xl">
              {firstStep.title}
            </h2>
            <p className="max-w-md text-base leading-relaxed text-text-secondary">
              {firstStep.description}
            </p>
          </div>
          <Card className="overflow-hidden bg-bg-card p-0">
            <Image
              src={stepImages[0]}
              alt={firstStep.title}
              width={900}
              height={650}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3] w-full object-cover"
            />
          </Card>
        </div>

        {/* Dua langkah berikutnya: grid kembar */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {restSteps.map((step, index) => {
            const Icon = stepIcons[step.icon];
            return (
              <Card key={step.step} hover className="overflow-hidden p-0">
                <Image
                  src={stepImages[index + 1]}
                  alt={step.title}
                  width={800}
                  height={500}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="aspect-[16/10] w-full object-cover"
                />
                <div className="space-y-3 p-6 sm:p-8">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-warm">
                    <Icon className="h-5 w-5 text-accent" aria-hidden />
                  </span>
                  <h2 className="font-display text-2xl text-text-primary">{step.title}</h2>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {step.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Button href={getWhatsAppUrl()} size="lg">
            Tanya Tim TEMORA
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
