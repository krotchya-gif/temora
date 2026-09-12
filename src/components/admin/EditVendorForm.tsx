"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type EditVendorFormProps = {
  vendorId: string;
  initial: {
    name: string;
    companyName: string;
    phone: string;
  };
};

export function EditVendorForm({ vendorId, initial }: EditVendorFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [phone, setPhone] = useState(initial.phone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    const res = await fetch(`/api/admin/vendors/${vendorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        company_name: companyName || null,
        phone: phone || null,
      }),
    });

    if (res.ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="text-text-secondary">Nama</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-text-secondary">Perusahaan</span>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={120}
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-text-secondary">Telepon (62…)</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="6281234567890"
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        />
      </label>

      <div className="flex flex-col items-stretch gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button className="w-full sm:w-auto" type="submit" size="sm" disabled={status === "saving"}>
          {status === "saving" ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
        {status === "saved" && (
          <p className="text-sm text-success">Tersimpan.</p>
        )}
        {status === "error" && (
          <p role="alert" className="text-sm text-danger">
            Gagal menyimpan. Coba lagi.
          </p>
        )}
      </div>
    </form>
  );
}
