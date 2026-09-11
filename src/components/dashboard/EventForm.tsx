"use client";
/* eslint-disable @next/next/no-img-element -- frame preview may be a local blob URL or Storage URL. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CalendarDays, Camera, Check, ExternalLink, ImagePlus, Loader2, MapPin, SlidersHorizontal, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DEFAULT_WATERMARK_TEXT } from "@/lib/constants";

export type EventFormValues = { name: string; theme: string; startsAt: string; endsAt: string; location: string; customSlug: string; isActive: boolean; watermarkText: string; watermarkPosition: string };
type EventFormProps = { mode: "create" | "edit"; eventId?: string; initial?: Partial<EventFormValues> & { frameUrl?: string | null }; tier: "free" | "basic" | "pro"; appearance?: boolean };

const THEME_OPTIONS = [
  { value: "", label: "Pilih tema", accent: "bg-accent" },
  { value: "wedding", label: "Wedding", accent: "bg-muted-mauve" },
  { value: "birthday", label: "Birthday", accent: "bg-dusty-blue" },
  { value: "corporate", label: "Corporate", accent: "bg-accent" },
  { value: "community", label: "Community", accent: "bg-accent-secondary" },
  { value: "other", label: "Lainnya", accent: "bg-accent" },
];
const POSITION_OPTIONS = [{ value: "bottom-right", label: "Kanan bawah" }, { value: "bottom-left", label: "Kiri bawah" }, { value: "top-right", label: "Kanan atas" }, { value: "top-left", label: "Kiri atas" }];

function toLocalInput(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SectionHeader({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description: string }) {
  return <div className="space-y-1"><p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">{eyebrow}</p><h2 id={id} className="font-display text-2xl leading-tight text-text-primary">{title}</h2><p className="max-w-prose text-sm leading-relaxed text-text-secondary">{description}</p></div>;
}
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary">{children}</label>;
}

export function EventForm({ mode, eventId, initial, tier, appearance = true }: EventFormProps) {
  const router = useRouter();
  const watermarkLocked = tier !== "pro";
  const [values, setValues] = useState<EventFormValues>({ name: initial?.name ?? "", theme: initial?.theme ?? "", startsAt: toLocalInput(initial?.startsAt), endsAt: toLocalInput(initial?.endsAt), location: initial?.location ?? "", customSlug: initial?.customSlug ?? "", isActive: initial?.isActive ?? true, watermarkText: initial?.watermarkText ?? "", watermarkPosition: initial?.watermarkPosition ?? "bottom-right" });
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [framePreview, setFramePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const selectedTheme = THEME_OPTIONS.find((option) => option.value === values.theme) ?? THEME_OPTIONS[0];
  const previewFrame = framePreview ?? initial?.frameUrl ?? null;
  const previewWatermark = watermarkLocked ? DEFAULT_WATERMARK_TEXT : values.watermarkText;
  const inputClass = "mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none transition-shadow placeholder:text-text-secondary/50 focus:border-accent focus:ring-2 focus:ring-dusty-blue/40";

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) { setValues((prev) => ({ ...prev, [key]: value })); }
  function handleFrameChange(file: File | null) { setFrameFile(file); if (framePreview) URL.revokeObjectURL(framePreview); setFramePreview(file ? URL.createObjectURL(file) : null); }
  async function uploadFrame(id: string): Promise<string | null> {
    if (!frameFile) return null;
    const formData = new FormData(); formData.set("frame", frameFile);
    const res = await fetch(`/api/events/${id}/frame`, { method: "POST", body: formData });
    if (!res.ok) { const data = (await res.json().catch(() => null)) as { error?: string } | null; return data?.error ?? "Frame gagal diunggah."; }
    return null;
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (values.name.trim().length < 3) throw new Error("Nama event minimal 3 karakter.");
      if (values.startsAt && values.endsAt && values.endsAt < values.startsAt) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      const payload = { name: values.name.trim(), theme: values.theme || undefined, startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined, endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined, location: values.location.trim() || undefined, isActive: values.isActive, watermarkText: tier === "pro" ? values.watermarkText.trim() || null : undefined, watermarkPosition: values.watermarkPosition === "bottom-right" ? undefined : values.watermarkPosition };
      let id = eventId;
      if (mode === "create") {
        const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, customSlug: values.customSlug.trim() }) });
        const data = (await res.json().catch(() => null)) as { error?: string; eventId?: string } | null;
        if (!res.ok || !data?.eventId) throw new Error(data?.error ?? "Gagal menyimpan event. Coba sekali lagi ya.");
        id = data.eventId;
      } else {
        const res = await fetch(`/api/events/${eventId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan perubahan. Coba sekali lagi ya.");
      }
      const frameError = await uploadFrame(id!); if (frameError) throw new Error(frameError);
      router.push(`/dashboard/events/${id}`); router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
    <div className="space-y-8">
      <section className="space-y-5" aria-labelledby="event-details-heading">
        <SectionHeader id="event-details-heading" eyebrow="01 · Event" title="Bikin ruang untuk momenmu" description="Mulai dari detail dasar. Semua ini akan membantu tamu mengenali acara sebelum mengambil foto." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><FieldLabel htmlFor="event-name">Nama event</FieldLabel><input id="event-name" type="text" required maxLength={80} value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Pernikahan Andi & Sinta" className={inputClass} /></div>
          <div><FieldLabel htmlFor="event-theme">Tema acara</FieldLabel><select id="event-theme" value={values.theme} onChange={(e) => set("theme", e.target.value)} className={inputClass}>{THEME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div><FieldLabel htmlFor="event-location"><MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />Lokasi <span className="font-normal text-text-secondary">(opsional)</span></FieldLabel><input id="event-location" type="text" maxLength={120} value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Yogyakarta" className={inputClass} /></div>
          <div><FieldLabel htmlFor="event-starts"><CalendarDays className="mr-1 inline h-3.5 w-3.5" aria-hidden />Mulai</FieldLabel><input id="event-starts" type="datetime-local" value={values.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inputClass} /></div>
          <div><FieldLabel htmlFor="event-ends">Selesai</FieldLabel><input id="event-ends" type="datetime-local" value={values.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={inputClass} /></div>
        </div>
      </section>

      {mode === "create" ? <div><FieldLabel htmlFor="event-slug">Link kustom <span className="font-normal text-text-secondary">(opsional)</span></FieldLabel><input id="event-slug" type="text" pattern="[a-z0-9\-]{6,60}" value={values.customSlug} onChange={(e) => set("customSlug", e.target.value.toLowerCase())} placeholder="andi-sinta-2026" className={`${inputClass} font-mono`} /><p className="mt-1 text-xs text-text-secondary">Kosongkan untuk dibuat otomatis. Link tidak bisa diganti setelah event dibuat.</p></div> : null}

      {appearance ? <>
      <section className="space-y-5 border-t border-border pt-8" aria-labelledby="event-cover-heading">
        <SectionHeader id="event-cover-heading" eyebrow="02 · Cover & QR" title="Beri wajah untuk event" description="Upload frame transparan 3:4. Frame ini akan muncul di foto tamu dan kartu QR event." />
        <div className="rounded-xl border border-dashed border-border bg-bg-warm/60 p-4 sm:p-5"><button type="button" onClick={() => frameInputRef.current?.click()} className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-5 text-center transition-colors hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"><span className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent"><UploadCloud className="h-5 w-5" aria-hidden /></span><span className="text-sm font-medium text-text-primary">{frameFile ? frameFile.name : previewFrame ? "Ganti frame event" : "Upload frame PNG"}</span><span className="text-xs text-text-secondary">Transparan · portrait 3:4 · maksimal 2560px</span></button><input ref={frameInputRef} type="file" accept="image/png" className="hidden" onChange={(e) => handleFrameChange(e.target.files?.[0] ?? null)} /><p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-text-secondary"><ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />Preview akan ikut berubah di kartu perangkat sebelah kanan.</p></div>
      </section>

      <section className="space-y-5 border-t border-border pt-8" aria-labelledby="event-style-heading">
        <SectionHeader id="event-style-heading" eyebrow="03 · Tampilan" title="Buat gayanya terasa pas" description="Pengaturan ini mengikuti token TEMORA dan akan tampil konsisten di halaman tamu." />
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border bg-bg-card p-4"><div className="mb-3 flex items-center gap-2"><Camera className="h-4 w-4 text-accent" aria-hidden /><p className="text-sm font-medium">Tampilan kamera</p></div><div className="flex items-center gap-2 text-xs text-text-secondary"><span className="h-2 w-2 rounded-full bg-success" aria-hidden />Portrait 3:4 · siap untuk HP tamu</div><p className="mt-2 text-xs leading-relaxed text-text-secondary">Preview kamera mengikuti rasio foto yang sama, jadi hasilnya tidak berubah saat disimpan.</p></div><div className="rounded-xl border border-border bg-bg-card p-4"><div className="mb-3 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden /><p className="text-sm font-medium">Filter foto</p></div><div className="flex flex-wrap gap-1.5">{["Warna Asli", "Lembut", "Hangat", "Monokrom"].map((label, index) => <span key={label} className={`rounded-md border px-2 py-1 text-xs ${index === 0 ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-text-secondary"}`}>{label}</span>)}</div><p className="mt-2 text-xs leading-relaxed text-text-secondary">Pilihan filter tersedia di halaman kamera tamu.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><FieldLabel htmlFor="event-watermark-text">Teks watermark</FieldLabel><input id="event-watermark-text" type="text" maxLength={60} disabled={watermarkLocked} value={watermarkLocked ? DEFAULT_WATERMARK_TEXT : values.watermarkText} onChange={(e) => set("watermarkText", e.target.value)} placeholder={DEFAULT_WATERMARK_TEXT} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-bg-warm disabled:opacity-60`} /><p className="mt-1 text-xs text-text-secondary">{watermarkLocked ? "Watermark default wajib untuk Free dan Basic." : "Kosongkan untuk foto tanpa watermark."}</p></div><div><FieldLabel htmlFor="event-watermark-position">Posisi watermark</FieldLabel><select id="event-watermark-position" disabled={watermarkLocked} value={watermarkLocked ? "bottom-right" : values.watermarkPosition} onChange={(e) => set("watermarkPosition", e.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-bg-warm disabled:opacity-60`}>{POSITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div>
      </section>
      </> : null}

      <section className="space-y-4 border-t border-border pt-8"><div className="flex items-start gap-3 rounded-xl bg-bg-warm p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/15 text-success"><Check className="h-4 w-4" aria-hidden /></span><div><p className="text-sm font-medium">Event siap dibagikan?</p><p className="mt-1 text-xs leading-relaxed text-text-secondary">Aktifkan setelah QR sudah dicetak atau dibagikan ke tamu.</p></div><label className="ml-auto inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 rounded border-border accent-[color:var(--color-accent)]" /><span className="sr-only">Aktifkan event</span></label></div>{error ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-text-primary">{error}</p> : null}<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-text-secondary">Perubahan baru terlihat oleh tamu setelah disimpan.</p><Button type="submit" disabled={busy}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Menyimpan…</> : mode === "create" ? "Simpan event" : "Simpan perubahan"}</Button></div></section>
    </div>

    {appearance ? <aside className="order-first lg:order-none lg:sticky lg:top-20" aria-label="Preview event"><div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-card"><div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="text-xs font-medium tracking-[0.12em] text-text-secondary uppercase">Preview live</p><p className="mt-0.5 text-sm font-medium text-text-primary">Yang tamu akan lihat</p></div><span className={`h-2.5 w-2.5 rounded-full ${selectedTheme.accent}`} aria-label={`Aksen ${selectedTheme.label}`} /></div><div className="bg-bg-warm px-6 pb-6 pt-5"><div className="mx-auto max-w-[190px] rounded-[2rem] border-[6px] border-text-primary bg-text-primary p-1.5 shadow-card"><div className="relative aspect-[3/4] overflow-hidden rounded-[1.45rem] bg-bg-base"><div className="absolute inset-0 bg-bg-warm"><div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-accent-secondary/30" /><div className="absolute -right-8 bottom-10 h-36 w-36 rounded-full bg-dusty-blue/25" /></div>{previewFrame ? <><span className="sr-only">Frame aktif:</span><img src={previewFrame} alt="Pratinjau frame event" className="absolute inset-0 h-full w-full object-contain" /></> : <div className="absolute inset-4 rounded-[1rem] border border-accent/30" />}<div className="absolute inset-x-3 bottom-5 text-center"><p className="font-display text-lg leading-none text-text-primary">{values.name || "Nama event kamu"}</p><p className="mt-1 text-[8px] tracking-[0.16em] text-text-secondary uppercase">{selectedTheme.label === "Pilih tema" ? "Keep the moments close" : selectedTheme.label}</p></div>{previewWatermark ? <p className="absolute bottom-2 right-3 max-w-[75%] truncate text-[6px] text-text-secondary">{previewWatermark}</p> : null}</div></div><div className="mx-auto mt-4 max-w-[220px] rounded-lg bg-text-primary px-3 py-2 text-center text-[10px] font-medium text-white">Mulai motret →</div><p className="mt-3 text-center text-xs text-text-secondary">Preview memakai rasio foto 3:4</p></div>{mode === "edit" && eventId ? <Link href={`/dashboard/events/${eventId}/qr`} className="flex min-h-11 items-center justify-center gap-2 border-t border-border px-4 text-sm font-medium text-accent transition-colors hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dusty-blue">Kelola QR event <ExternalLink className="h-4 w-4" aria-hidden /></Link> : <p className="border-t border-border px-4 py-3 text-center text-xs text-text-secondary">Simpan event untuk mendapatkan link tamu.</p>}</div></aside> : null}
  </form>;
}
