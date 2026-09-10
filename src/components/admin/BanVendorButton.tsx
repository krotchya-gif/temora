"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BanVendorButtonProps = {
  vendorId: string;
  vendorName: string;
  banned: boolean;
};

export function BanVendorButton({
  vendorId,
  vendorName,
  banned,
}: BanVendorButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (banned) {
      if (
        !window.confirm(
          `Buka ban ${vendorName}? Login bisa dilakukan lagi; event TIDAK aktif otomatis.`,
        )
      ) {
        return;
      }
    } else if (
      !window.confirm(
        `Ban ${vendorName}? Login ditolak, sesi aktif diblokir, dan SEMUA eventnya dinonaktifkan.`,
      )
    ) {
      return;
    }

    setBusy(true);
    const res = await fetch(`/api/admin/vendors/${vendorId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !banned }),
    });
    setBusy(false);

    if (res.ok) router.refresh();
    else window.alert("Gagal mengubah status ban. Coba lagi.");
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={`min-h-11 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:opacity-50 ${
        banned
          ? "border border-success/40 text-success hover:bg-success/10"
          : "border border-danger/40 text-danger hover:bg-danger/10"
      }`}
    >
      {busy ? "…" : banned ? "Buka Ban" : "Ban Vendor"}
    </button>
  );
}
