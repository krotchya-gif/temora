import type { Metadata } from "next";
import { Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getWhatsAppUrl, PRICING_TIERS } from "@/lib/constants";
import { cn, formatIdr } from "@/lib/utils";

export const metadata: Metadata = {
  // Category keyword BRAND.md §9 di title.
  title: "Paket & Harga — Virtual Photobooth",
  description:
    "Paket TEMORA virtual photobooth untuk wedding, birthday, dan corporate event: mulai gratis 100 foto, Basic Rp 99K, Pro Rp 299K tanpa kontrak.",
};

export default function PricingPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl leading-tight text-text-primary sm:text-5xl">
            Pilih paket yang pas
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Mulai gratis untuk satu acara. Upgrade kapan saja lewat Xendit,
            tanpa kontrak panjang.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.id}
              hover
              className={cn(
                "relative flex flex-col",
                tier.highlighted && "border-accent/40 shadow-card ring-1 ring-accent/20",
              )}
            >
              {tier.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                  Paling populer
                </span>
              ) : null}

              <div className="space-y-1">
                <h2 className="font-display text-2xl text-text-primary">{tier.name}</h2>
                <p className="text-sm text-text-secondary">{tier.description}</p>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl leading-none text-text-primary">
                  {tier.priceLabel}
                </span>
                {"period" in tier && tier.period ? (
                  <span className="text-sm text-text-secondary">{tier.period}</span>
                ) : null}
              </div>
              {tier.price > 0 ? (
                <p className="mt-1 text-xs text-text-secondary">
                  {formatIdr(tier.price)} per bulan
                </p>
              ) : null}

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                href={tier.href}
                variant={tier.highlighted ? "primary" : "secondary"}
                className="mt-8 w-full"
              >
                {tier.cta}
              </Button>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-text-secondary">
          Butuh bantuan memilih paket?{" "}
          <a href={getWhatsAppUrl()} className="font-medium text-accent hover:text-accent-hover">
            Chat kami di WhatsApp
          </a>
        </p>
      </section>
    </MarketingLayout>
  );
}
