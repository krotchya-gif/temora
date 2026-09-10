"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type UploadResult = { ok?: boolean; error?: string };

export function ShowcaseUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files || files.length === 0) {
      setMessage({ kind: "err", text: "Pilih minimal satu foto." });
      return;
    }

    // Validasi pra-fetch — error instan tanpa menembak server (task fix upload).
    const MAX = 10 * 1024 * 1024;
    for (const file of Array.from(files)) {
      const isImageType =
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        /\.(jpe?g|png)$/i.test(file.name);
      if (!isImageType) {
        setMessage({
          kind: "err",
          text: `"${file.name}" bukan JPEG/PNG. Foto iPhone HEIC: ubah dulu ke JPG lewat pengaturan kamera atau konverter.`,
        });
        return;
      }
      if (file.size > MAX) {
        setMessage({
          kind: "err",
          text: `"${file.name}" lebih dari 10MB. Kompres dulu ya.`,
        });
        return;
      }
      if (file.size < 1024) {
        setMessage({
          kind: "err",
          text: `"${file.name}" terlalu kecil — pastikan itu foto yang benar.`,
        });
        return;
      }
    }

    setBusy(true);
    setMessage(null);

    let success = 0;
    let lastError: string | null = null;
    for (let i = 0; i < files.length; i++) {
      const form = new FormData();
      form.set("file", files[i]);
      // Multi-file: judul diberi nomor urut supaya tidak duplikat.
      form.set(
        "title",
        files.length > 1 ? `${title} ${i + 1}` : title,
      );
      if (caption) form.set("caption", caption);

      const res = await fetch("/api/admin/showcase", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as UploadResult;
      if (res.ok && data.ok) success += 1;
      else lastError = data.error ?? "Upload gagal.";
    }

    setBusy(false);
    if (success > 0) {
      setMessage({
        kind: "ok",
        text: `${success} foto terupload.${lastError ? ` (${lastError})` : ""}`,
      });
      setFiles(null);
      router.refresh();
    } else {
      setMessage({ kind: "err", text: lastError ?? "Upload gagal." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-border bg-bg-card p-5 sm:grid-cols-2"
    >
      <label className="space-y-1 text-sm">
        <span className="text-text-secondary">Judul * (acara/kota)</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={2}
          maxLength={120}
          placeholder="Pernikahan Rina & Budi — Yogyakarta"
          className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-text-secondary">Kutipan singkat (opsional)</span>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={280}
          placeholder="Momen tersenyum paling jujur sepanjang acara."
          className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-text-secondary">Foto (JPEG/PNG, maks 10MB per file)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="w-full text-sm text-text-secondary file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-bg-warm file:px-3 file:text-sm file:text-accent"
        />
        <span className="block text-xs text-text-secondary">
          Foto iPhone format HEIC ubah dulu ke JPG ya.
        </span>
      </label>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <Button className="w-full sm:w-auto" type="submit" size="sm" disabled={busy}>
          {busy ? "Mengunggah…" : "Upload"}
        </Button>
        {message && (
          <p
            role="status"
            className={`text-sm ${message.kind === "ok" ? "text-success" : "text-danger"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
