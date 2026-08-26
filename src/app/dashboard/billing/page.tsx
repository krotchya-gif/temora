import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { UpgradeButton } from "@/components/dashboard/UpgradeButton";
import { PRICING_TIERS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Billing",
};

// Data per-sesi vendor — selalu render dinamis.
export const dynamic = "force-dynamic";

type InvoiceRow = {
  id: string;
  tier: string;
  amount_idr: number;
  status: string;
  xendit_payment_url: string | null;
  period_end: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Menunggu", className: "bg-warning/15 text-warning" },
  paid: { label: "Lunas", className: "bg-success/15 text-success" },
  expired: { label: "Kedaluwarsa", className: "bg-bg-warm text-text-secondary" },
  failed: { label: "Gagal", className: "bg-danger/15 text-danger" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Filter eksplisit + RLS v_self (defense in depth, task 019).
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("subscription_tier")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (vendorError) {
    console.error("[billing] vendor:", vendorError.message);
  }

  const currentTier = vendor?.subscription_tier ?? "free";

  // Riwayat invoice — filter eksplisit + RLS s_owner.
  const { data: invoices } = await supabase
    .from("subscriptions")
    .select(
      "id, tier, amount_idr, status, xendit_payment_url, period_end, created_at",
    )
    .eq("vendor_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Billing</h1>
        <p className="text-sm text-text-secondary">
          Paket saat ini:{" "}
          <span className="font-medium capitalize text-accent">{currentTier}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const isUpgrade = tier.id === "basic" || tier.id === "pro";

          return (
            <Card
              key={tier.id}
              className={
                isCurrent ? "flex flex-col border-accent/40 ring-1 ring-accent/20" : "flex flex-col"
              }
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl text-text-primary">{tier.name}</h2>
                {isCurrent ? (
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
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

              {isUpgrade && !isCurrent ? (
                <UpgradeButton tier={tier.id as "basic" | "pro"} />
              ) : null}
            </Card>
          );
        })}
      </div>

      {/* Riwayat invoice */}
      <section aria-label="Riwayat invoice" className="space-y-3">
        <h2 className="font-display text-xl text-text-primary">Riwayat invoice</h2>

        {!invoices || invoices.length === 0 ? (
          <Card className="px-6 py-10 text-center text-sm leading-relaxed text-text-secondary">
            Belum ada transaksi. Upgrade paket kapan pun kamu siap naik kelas.
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Paket</th>
                  <th className="px-4 py-3 font-medium">Nominal</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Periode berakhir</th>
                </tr>
              </thead>
              <tbody>
                {(invoices as unknown as InvoiceRow[]).map((invoice) => {
                  const badge =
                    STATUS_LABELS[invoice.status] ?? STATUS_LABELS.pending;
                  return (
                    <tr key={invoice.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="px-4 py-3 capitalize text-text-primary">
                        {invoice.tier}
                      </td>
                      <td className="px-4 py-3 font-mono text-text-primary">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(invoice.amount_idr)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(invoice.period_end)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
