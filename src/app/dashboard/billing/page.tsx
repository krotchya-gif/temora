import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getWhatsAppUrl, PRICING_TIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Billing",
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Billing</h1>
        <p className="text-sm text-text-secondary">
          Paket saat ini: <span className="font-medium text-accent">Free</span>
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          Checkout Xendit dan riwayat invoice sedang disiapkan. Untuk upgrade
          lebih awal, hubungi tim TEMORA lewat{" "}
          <a
            href={getWhatsAppUrl()}
            className="font-medium text-accent hover:text-accent-hover"
          >
            WhatsApp
          </a>
          .
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const isCurrent = tier.id === "free";
          return (
            <Card
              key={tier.id}
              className={cn(
                "flex flex-col",
                isCurrent && "border-accent/40 ring-1 ring-accent/20",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl text-text-primary">{tier.name}</h2>
                {isCurrent ? (
                  <span className="rounded-full bg-bg-warm px-2.5 py-1 text-xs font-medium text-accent">
                    Paket kamu
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-sm text-text-secondary">
                {tier.priceLabel}
                {"period" in tier && tier.period ? tier.period : null}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              {!isCurrent ? (
                <Button
                  href="/dashboard/billing"
                  variant="secondary"
                  size="sm"
                  disabled
                  className="mt-6 w-full"
                >
                  Segera tersedia
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
