"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type EventFormValues = {
  name: string;
  theme: string;
  startsAt: string; // datetime-local
  endsAt: string;
  location: string;
  customSlug: string;
  isActive: boolean;
};

type EventFormProps = {
  mode: "create" | "edit";
  eventId?: string;
  initial?: Partial<EventFormValues>;
};

const THEME_OPTIONS = [
  { value: "", label: "Pilih tema (opsional)" },
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "community", label: "Community" },
  { value: "other", label: "Lainnya" },
];

function toLocalInput(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ mode, eventId, initial }: EventFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>({
    name: initial?.name ?? "",
    theme: initial?.theme ?? "",
    startsAt: toLocalInput(initial?.startsAt),
    endsAt: toLocalInput(initial?.endsAt),
    location: initial?.location ?? "",
    customSlug: initial?.customSlug ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [framePreview, setFramePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleFrameChange(file: File | null) {
    setFrameFile(file);
    if (framePreview) URL.revokeObjectURL(framePreview);
    setFramePreview(file ? URL.createObjectURL(file) : null);
  }

  async function uploadFrame(id: string): Promise<string | null> {
    if (!frameFile) return null;
    const formData = new FormData();
    formData.set("frame", frameFile);
    const res = await fetch(`/api/events/${id}/frame`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return data?.error ?? "Frame gagal diunggah.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      // Validasi ringan client-side; server tetap zod (defense in depth).
      if (values.name.trim().length < 3) {
        throw new Error("Nama event minimal 3 karakter.");
      }
      if (values.startsAt && values.endsAt && values.endsAt < values.startsAt) {
        throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      }

      const payload = {
        name: values.name.trim(),
        theme: values.theme || undefined,
        startsAt: values.startsAt
          ? new Date(values.startsAt).toISOString()
          : undefined,
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
        location: values.location.trim() || undefined,
        isActive: values.isActive,
      };

      let id = eventId;
      if (mode === "create") {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, customSlug: values.customSlug.trim() }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          eventId?: string;
        } | null;
        if (!res.ok || !data?.eventId) {
          throw new Error(data?.error ?? "Gagal menyimpan event. Coba sekali lagi ya.");
        }
        id = data.eventId;
      } else {
        const res = await fetch(`/api/events/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Gagal menyimpan perubahan. Coba sekali lagi ya.");
        }
      }

      const frameError = await uploadFrame(id!);
      if (frameError) {
        setError(frameError);
        setBusy(false);
        return;
      }

      router.push(`/dashboard/events/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="event-name" className="block text-sm font-medium text-text-primary">
          Nama event
        </label>
        <input
          id="event-name"
          type="text"
          required
          maxLength={80}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Pernikahan Andi & Sinta"
          className="mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
        />
      </div>

      <div>
        <label htmlFor="event-theme" className="block text-sm font-medium text-text-primary">
          Tema
        </label>
        <select
          id="event-theme"
          value={values.theme}
          onChange={(e) => set("theme", e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
        >
          {THEME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="event-starts" className="block text-sm font-medium text-text-primary">
            Tanggal mulai
          </label>
          <input
            id="event-starts"
            type="datetime-local"
            value={values.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
          />
        </div>
        <div>
          <label htmlFor="event-ends" className="block text-sm font-medium text-text-primary">
            Tanggal selesai
          </label>
          <input
            id="event-ends"
            type="datetime-local"
            value={values.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
          />
        </div>
      </div>

      <div>
        <label htmlFor="event-location" className="block text-sm font-medium text-text-primary">
          Lokasi (opsional)
        </label>
        <input
          id="event-location"
          type="text"
          maxLength={120}
          value={values.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="Yogyakarta"
          className="mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
        />
      </div>

      {/* Slug immutable — hanya tampil saat create; edit menampilkan readonly */}
      {mode === "create" ? (
        <div>
          <label htmlFor="event-slug" className="block text-sm font-medium text-text-primary">
            Link kustom (opsional)
          </label>
          <input
            id="event-slug"
            type="text"
            pattern="[a-z0-9\-]{6,60}"
            value={values.customSlug}
            onChange={(e) => set("customSlug", e.target.value.toLowerCase())}
            placeholder="andi-sinta-2026"
            className="mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Kosongkan untuk otomatis dari nama event. Tidak bisa diganti setelah dibuat.
          </p>
        </div>
      ) : null}

      {/* Frame upload dengan preview instan (task 007 §4.2) */}
      <div>
        <span className="block text-sm font-medium text-text-primary">
          Frame PNG transparan (opsional)
        </span>
        <button
          type="button"
          onClick={() => frameInputRef.current?.click()}
          className="mt-1.5 flex min-h-11 w-full items-center gap-3 rounded-lg border border-dashed border-border bg-bg-card px-4 py-3 text-left transition-colors hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        >
          <ImagePlus className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          <span className="text-sm text-text-secondary">
            {frameFile
              ? frameFile.name
              : "Tap untuk pilih file · PNG transparan, sisi panjang maks 2560px"}
          </span>
        </button>
        <input
          ref={frameInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(e) => handleFrameChange(e.target.files?.[0] ?? null)}
        />
        {framePreview ? (
          <div className="relative mt-3 aspect-[3/4] w-40 overflow-hidden rounded-xl bg-bg-warm shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob lokal */}
            <img
              src={framePreview}
              alt="Pratinjau frame"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        ) : null}
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="h-4 w-4 rounded border-border accent-[color:var(--color-accent)]"
        />
        <span className="text-sm text-text-primary">
          Langsung aktifkan event ini
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-text-primary"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Menyimpan…
          </>
        ) : mode === "create" ? (
          "Simpan Event"
        ) : (
          "Simpan Perubahan"
        )}
      </Button>
    </form>
  );
}
