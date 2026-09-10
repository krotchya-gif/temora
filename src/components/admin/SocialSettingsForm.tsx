"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type SocialSettingsFormProps = {
  initial: {
    instagram: string;
    tiktok: string;
    facebook: string;
  };
};

const FIELDS = [
  { key: "instagram" as const, label: "URL Instagram", placeholder: "https://instagram.com/temora.site" },
  { key: "tiktok" as const, label: "URL TikTok", placeholder: "https://tiktok.com/@temora.site" },
  { key: "facebook" as const, label: "URL Facebook", placeholder: "https://facebook.com/temora.site" },
];

export function SocialSettingsForm({ initial }: SocialSettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    // Nilai kosong dikirim apa adanya → ikon disembunyikan dari footer.
    const settings = Object.fromEntries(
      FIELDS.map((f) => [`social_${f.key}`, values[f.key].trim()]),
    );

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });

    if (res.ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
      {FIELDS.map((field) => (
        <label key={field.key} className="space-y-1 text-sm">
          <span className="text-text-secondary">{field.label}</span>
          <input
            value={values[field.key]}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
            placeholder={field.placeholder}
            type="url"
            className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
          />
        </label>
      ))}
      <div className="flex flex-col items-stretch gap-3 sm:col-span-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button className="w-full sm:w-auto" type="submit" size="sm" disabled={status === "saving"}>
          {status === "saving" ? "Menyimpan…" : "Simpan Pengaturan"}
        </Button>
        {status === "saved" && (
          <p className="text-sm text-success">Tersimpan — ikon footer diperbarui.</p>
        )}
        {status === "error" && (
          <p role="alert" className="text-sm text-danger">
            Gagal menyimpan. Pastikan URL diawali http(s)://
          </p>
        )}
        <p className="ml-auto hidden text-xs text-text-secondary lg:block">
          Kosongkan untuk menyembunyikan ikon.
        </p>
      </div>
    </form>
  );
}
