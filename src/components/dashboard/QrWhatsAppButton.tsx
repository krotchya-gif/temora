"use client";

import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QrTemplate } from "@/lib/validation/event";

type QrWhatsAppButtonProps = {
  eventId: string;
  eventName: string;
  tableId: string;
  tableLabel: string;
  template: QrTemplate;
  title: string;
  subtitle: string;
  tagline: string;
  className?: string;
};

function token(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function drawWrappedText(context: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = visible[maxLines - 1];
    while (last && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    visible[maxLines - 1] = `${last}…`;
  }
  visible.forEach((text, index) => context.fillText(text, x, y + index * lineHeight));
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR belum bisa dimuat."));
    image.src = url;
  });
}

async function buildCardPng(props: QrWhatsAppButtonProps) {
  const { eventId, tableId, eventName, tableLabel, template, title, subtitle, tagline } = props;
  await document.fonts.ready;
  const qrResponse = await fetch(`/api/events/${eventId}/qr/${tableId}`);
  if (!qrResponse.ok) throw new Error("QR belum bisa dimuat.");
  const qrObjectUrl = URL.createObjectURL(await qrResponse.blob());

  try {
    const qrImage = await loadImage(qrObjectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Kartu belum bisa dibuat.");

    const bgCard = token("--color-bg-card", "white");
    const bgWarm = token("--color-bg-warm", "whitesmoke");
    const bgBase = token("--color-bg-base", "white");
    const textPrimary = token("--color-text-primary", "black");
    const textSecondary = token("--color-text-secondary", "dimgray");
    const accent = token("--color-accent", "saddlebrown");
    const accentSecondary = token("--color-accent-secondary", "tan");
    const dustyBlue = token("--color-dusty-blue", "lightsteelblue");
    const mutedMauve = token("--color-muted-mauve", "rosybrown");
    const border = token("--color-border", "lightgray");
    const background = template === "night" ? textPrimary : template === "paper" ? bgWarm : template === "rose" ? mutedMauve : template === "mono" ? bgCard : bgBase;
    const foreground = template === "night" ? bgBase : textPrimary;
    const muted = template === "night" ? border : textSecondary;

    context.fillStyle = bgWarm;
    context.fillRect(0, 0, canvas.width, canvas.height);
    roundedRect(context, 32, 32, 1016, 1286, 64);
    context.fillStyle = background;
    context.fill();

    if (template === "bloom") {
      context.globalAlpha = 0.32;
      context.fillStyle = accentSecondary;
      context.beginPath(); context.arc(900, 260, 250, 0, Math.PI * 2); context.fill();
      context.fillStyle = dustyBlue;
      context.beginPath(); context.arc(120, 1120, 270, 0, Math.PI * 2); context.fill();
      context.globalAlpha = 1;
    }

    context.strokeStyle = template === "paper" ? accentSecondary : foreground;
    context.lineWidth = 4;
    context.globalAlpha = 0.65;
    for (const [x, y, dx, dy] of [[76, 76, 1, 1], [1004, 76, -1, 1], [76, 1274, 1, -1], [1004, 1274, -1, -1]]) {
      context.beginPath(); context.moveTo(x, y + dy * 42); context.lineTo(x, y); context.lineTo(x + dx * 42, y); context.stroke();
    }
    context.globalAlpha = 1;

    context.textAlign = "center";
    context.fillStyle = template === "night" ? accentSecondary : accent;
    context.font = "700 24px 'Plus Jakarta Sans', sans-serif";
    context.letterSpacing = "7px";
    context.fillText("SCAN & JEPRET", 540, 118);
    context.fillStyle = foreground;
    context.font = "600 80px 'Cormorant Garamond', Georgia, serif";
    context.letterSpacing = "0px";
    drawWrappedText(context, title || eventName, 540, 205, 840, 78, 2);
    context.fillStyle = muted;
    context.font = "400 28px 'Plus Jakarta Sans', sans-serif";
    drawWrappedText(context, subtitle || "Scan QR-nya, jepret momenmu versi kamu.", 540, 350, 760, 38, 2);

    roundedRect(context, 225, 430, 630, 630, 34);
    context.fillStyle = bgCard;
    context.fill();
    context.drawImage(qrImage, 265, 470, 550, 550);

    context.fillStyle = foreground;
    context.font = "700 48px 'Plus Jakarta Sans', sans-serif";
    context.fillText(tableLabel.toUpperCase(), 540, 1138);
    context.fillStyle = muted;
    context.font = "italic 34px 'Cormorant Garamond', Georgia, serif";
    context.fillText(tagline || "Keep the moments close.", 540, 1198, 820);
    context.fillStyle = foreground;
    context.font = "600 30px 'Cormorant Garamond', Georgia, serif";
    context.letterSpacing = "8px";
    context.fillText("TEMORA", 540, 1270);

    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Kartu belum bisa dibuat.")), "image/png", 0.95));
    const safeLabel = tableLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "meja";
    return new File([blob], `temora-${safeLabel}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(qrObjectUrl);
  }
}

export function QrWhatsAppButton(props: QrWhatsAppButtonProps) {
  const { eventId, eventName, tableId, tableLabel, className } = props;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function share() {
    setBusy(true);
    setFailed(false);
    const guestUrl = `${window.location.origin}/p/${eventId}/${tableId}`;
    const message = `Hai! Ini kartu QR ${tableLabel} untuk ${eventName}.\n\nBuka photobooth TEMORA: ${guestUrl}`;
    try {
      const file = await buildCardPng(props);
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Kartu QR ${tableLabel}`, text: message, files: [file] });
        return;
      }
      const downloadUrl = URL.createObjectURL(file);
      const download = document.createElement("a");
      download.href = downloadUrl;
      download.download = file.name;
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={() => void share()} disabled={busy} aria-label={`Bagikan kartu QR ${tableLabel} lewat WhatsApp`} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent/30 bg-bg-card px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue disabled:cursor-wait disabled:opacity-60", className)}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <MessageCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
      {busy ? "Menyiapkan kartu…" : failed ? "Coba bagikan lagi" : "Bagikan via WhatsApp"}
    </button>
  );
}
