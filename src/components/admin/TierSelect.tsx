"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const TIERS = ["free", "basic", "pro"] as const;

type TierSelectProps = {
  vendorId: string;
  vendorName: string;
  currentTier: string;
};

export function TierSelect({ vendorId, vendorName, currentTier }: TierSelectProps) {
  const router = useRouter();
  const [value, setValue] = useState(currentTier);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleChange(next: string) {
    if (next === value) return;
    const label = next === "free" ? "Free" : next === "basic" ? "Basic" : "Pro";
    const confirmed = window.confirm(
      `Ubah ${vendorName} ke paket ${label}? Perubahan hanya berpengaruh ke event baru (limit foto event lama tidak berubah).`,
    );
    if (!confirmed) return;

    setError(null);
    const res = await fetch(`/api/admin/vendors/${vendorId}/tier`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: next }),
    });

    if (res.ok) {
      setValue(next);
      startTransition(() => router.refresh());
    } else {
      setError("Gagal menyimpan. Coba lagi.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`Paket ${vendorName}`}
        value={value}
        disabled={pending}
        onChange={(e) => void handleChange(e.target.value)}
        className="min-h-11 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
      >
        {TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {tier === "free" ? "Free" : tier === "basic" ? "Basic" : "Pro"}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
