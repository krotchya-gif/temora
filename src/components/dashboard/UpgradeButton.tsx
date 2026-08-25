"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type UpgradeButtonProps = {
  tier: "basic" | "pro";
};

export function UpgradeButton({ tier }: UpgradeButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json().catch(() => null)) as {
        paymentUrl?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.paymentUrl) {
        throw new Error(data?.error ?? "Pembayaran sedang tidak tersedia. Coba lagi ya.");
      }
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 w-full">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void checkout()}
        disabled={busy}
        className="w-full"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Menyiapkan…
          </>
        ) : (
          `Upgrade ke ${tier === "basic" ? "Basic" : "Pro"}`
        )}
      </Button>
      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs leading-relaxed text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
