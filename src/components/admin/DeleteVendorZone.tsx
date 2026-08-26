"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteVendorZoneProps = {
  vendorId: string;
  vendorEmail: string;
};

// Zona bahaya: konfirmasi dengan mengetik email vendor persis (task 019).
export function DeleteVendorZone({ vendorId, vendorEmail }: DeleteVendorZoneProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/vendors/${vendorId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail: typed.trim() }),
    });
    setBusy(false);

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      warning?: string;
      error?: string;
    };

    if (res.ok && data.ok) {
      router.push(data.warning ? "/admin/vendors?deleted=partial" : "/admin/vendors?deleted=1");
      router.refresh();
    } else {
      setError(data.error ?? "Gagal menghapus. Coba lagi.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
      >
        Hapus Permanen…
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
      <p className="text-sm font-medium text-danger">
        Zona bahaya — tindakan ini tidak dapat dibatalkan.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
        Semua event, foto, subscription, dan akun akan dihapus permanen
        (termasuk objek Storage). Ketik email vendor{" "}
        <span className="font-mono text-text-primary">{vendorEmail}</span> untuk
        mengonfirmasi.
      </p>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={vendorEmail}
        className="mt-3 w-full max-w-sm rounded-lg border border-danger/40 bg-bg-card px-3 py-2 font-mono text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        autoComplete="off"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={busy || typed.trim().toLowerCase() !== vendorEmail.toLowerCase()}
          onClick={() => void handleDelete()}
          className="min-h-9 rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:pointer-events-none disabled:opacity-50"
        >
          {busy ? "Menghapus…" : "Hapus Permanen"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          className="min-h-9 rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-warm"
        >
          Batal
        </button>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
