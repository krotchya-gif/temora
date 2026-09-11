"use client";

import { useMemo, useRef, useState } from "react";
import { Captions, ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, MousePointer2, Type } from "lucide-react";
import { GuestPhoneMockup } from "@/components/photobooth/GuestPhoneMockup";
import { Button } from "@/components/ui/Button";

type CoverTemplate = "bloom" | "rose" | "mono" | "night" | "paper";
type CoverEditorProps = {
  eventId: string;
  eventName: string;
  initial: { template: CoverTemplate; imageUrl: string | null; title: string | null; subtitle: string | null; buttonText: string };
};

const templates: { value: CoverTemplate; label: string; className: string }[] = [
  { value: "bloom", label: "Bloom", className: "bg-bg-warm" },
  { value: "rose", label: "Rose", className: "bg-muted-mauve/40" },
  { value: "mono", label: "Mono", className: "bg-text-primary" },
  { value: "night", label: "Night", className: "bg-accent" },
  { value: "paper", label: "Paper", className: "bg-bg-card" },
];

const fieldMeta = {
  image: { label: "Foto", icon: ImageIcon, hint: "JPG/PNG, maks 4MB. Paling bagus foto tegak." },
  title: { label: "Judul", icon: Type, hint: "Judul yang tamu lihat di cover." },
  subtitle: { label: "Subjudul", icon: Captions, hint: "Kalimat pendek di bawah judul." },
  button: { label: "Tombol", icon: MousePointer2, hint: "Ajak tamu masuk ke photobooth." },
} as const;
type ActiveField = keyof typeof fieldMeta;

const templateStyles: Record<CoverTemplate, string> = { bloom: "bg-bg-warm text-text-primary", rose: "bg-muted-mauve/40 text-text-primary", mono: "bg-text-primary text-bg-base", night: "bg-accent text-bg-base", paper: "bg-bg-card text-text-primary" };

export function CoverEditor({ eventId, eventName, initial }: CoverEditorProps) {
  const [template, setTemplate] = useState<CoverTemplate>(initial.template);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState(initial.title ?? eventName);
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "Simpan momenmu versi kamu.");
  const [buttonText, setButtonText] = useState(initial.buttonText || "Mulai motret");
  const [activeField, setActiveField] = useState<ActiveField>("image");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const templateIndex = templates.findIndex((item) => item.value === template);
  const activeMeta = fieldMeta[activeField];
  const ActiveIcon = activeMeta.icon;
  const currentTemplate = useMemo(() => templates[templateIndex] ?? templates[0], [templateIndex]);
  const fieldButtons = (Object.keys(fieldMeta) as ActiveField[]).map((field) => {
    const meta = fieldMeta[field];
    const Icon = meta.icon;
    const active = field === activeField;
    return (
      <button key={field} type="button" onClick={() => field === "image" ? fileRef.current?.click() : setActiveField(field)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue ${active ? "border-accent bg-bg-card text-accent shadow-soft" : "border-border bg-bg-base text-text-primary hover:bg-bg-card"}`}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-bg-warm"><Icon className="h-4 w-4" aria-hidden /></span>
        {meta.label}
      </button>
    );
  });

  function selectImage(file: File | null) {
    setImageFile(file);
    if (file) setImageUrl(URL.createObjectURL(file));
  }
  function moveTemplate(direction: -1 | 1) {
    const next = (templateIndex + direction + templates.length) % templates.length;
    setTemplate(templates[next].value);
  }
  async function save() {
    setBusy(true); setMessage(null);
    try {
      let savedImageUrl = imageUrl;
      if (imageFile) {
        const form = new FormData(); form.set("cover", imageFile);
        const upload = await fetch(`/api/events/${eventId}/cover`, { method: "POST", body: form });
        const data = (await upload.json().catch(() => null)) as { error?: string; coverImageUrl?: string } | null;
        if (!upload.ok || !data?.coverImageUrl) throw new Error(data?.error ?? "Foto cover gagal disimpan.");
        savedImageUrl = data.coverImageUrl;
      }
      const response = await fetch(`/api/events/${eventId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverTemplate: template, coverImageUrl: savedImageUrl, coverTitle: title.trim() || null, coverSubtitle: subtitle.trim() || null, coverButtonText: buttonText.trim() || "Mulai motret" }) });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Cover gagal disimpan.");
      setImageFile(null); setMessage("Cover sudah tersimpan.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-4xl">
    <div className="mb-6 text-center"><h1 className="font-display text-3xl text-text-primary">{currentTemplate.label}</h1><p className="mt-1 text-sm text-text-secondary">Geser buat ganti template</p><p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-secondary/70">Template {templateIndex + 1} dari {templates.length}</p></div>
    <div className="relative flex items-center justify-center gap-2 sm:gap-7">
      <button type="button" onClick={() => moveTemplate(-1)} aria-label="Template sebelumnya" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-bg-base text-text-primary transition-colors hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"><ChevronLeft className="h-5 w-5" aria-hidden /></button>
      <GuestPhoneMockup variant="cover" title={title || eventName || "Nama event"} subtitle={subtitle || "Simpan momenmu"} imageUrl={imageUrl} imageAlt="Preview foto event" stageClassName={templateStyles[template]} actionLabel={buttonText || "Ambil momen"} caption="Tampilan tamu · preview" className="w-[min(58vw,232px)] sm:w-[232px]" />
      <button type="button" onClick={() => moveTemplate(1)} aria-label="Template berikutnya" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-bg-base text-text-primary transition-colors hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"><ChevronRight className="h-5 w-5" aria-hidden /></button>
    </div>
    <div className="mx-auto mt-6 grid max-w-[520px] grid-cols-4 gap-2 sm:gap-3">{fieldButtons}</div>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => selectImage(e.target.files?.[0] ?? null)} />
    <div className="mx-auto mt-3 max-w-[520px] rounded-xl border border-border bg-bg-card p-4"><div className="flex items-center gap-2"><ActiveIcon className="h-4 w-4 text-accent" aria-hidden /><p className="text-sm font-medium text-text-primary">Edit {activeMeta.label.toLowerCase()}</p></div>{activeField === "title" ? <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="mt-3 w-full rounded-lg border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-dusty-blue/40" /> : null}{activeField === "subtitle" ? <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={120} className="mt-3 w-full rounded-lg border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-dusty-blue/40" /> : null}{activeField === "button" ? <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={30} className="mt-3 w-full rounded-lg border border-border bg-bg-base px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-dusty-blue/40" /> : null}<p className="mt-2 text-xs text-text-secondary">{activeField === "image" ? (imageFile ? imageFile.name : imageUrl ? "Foto cover aktif." : activeMeta.hint) : activeMeta.hint}</p></div>
    {message ? <p role="status" className="mx-auto mt-3 max-w-[480px] rounded-lg border border-border bg-bg-warm px-3 py-2 text-center text-xs text-text-primary">{message}</p> : null}
    <div className="mx-auto mt-5 w-full max-w-[520px]"><Button type="button" onClick={() => void save()} disabled={busy} className="flex w-full">{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Menyimpan…</> : "Selesai"}</Button></div>
  </div>;
}
