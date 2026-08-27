"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

type MomentComposerProps = {
  eventId: string;
  tableId: string;
  /** Foto hasil capture terakhir (opsional — moment bisa tanpa foto). */
  getPhotoId: () => string | null;
  onToast: (message: string) => void;
};

// Prompt moments (task 012, design-system §6): "Apa yang sedang kamu rasakan?"
// Rate limit & validasi otoritatif di server (1 moment / 60 dtk / meja).
export function MomentComposer({
  eventId,
  tableId,
  getPhotoId,
  onToast,
}: MomentComposerProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const content = value.trim();
    if (!content || busy || sent) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/moments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          tableId,
          photoId: getPhotoId() ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Momen belum tersimpan.");
      setSent(true);
      onToast("Momenmu tersimpan ✨");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="max-w-sm text-center text-xs text-success">
        Momenmu sudah jadi bagian dari cerita acara ini ✨
      </p>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-1.5">
      <label
        htmlFor="moment-content"
        className="block text-xs font-medium text-text-secondary"
      >
        Apa yang sedang kamu rasakan?
      </label>
      <div className="flex items-end gap-2">
        <input
          id="moment-content"
          type="text"
          maxLength={280}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) void submit();
          }}
          placeholder="Tulis momenmu… (opsional)"
          disabled={busy}
          className="min-h-11 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-dusty-blue disabled:opacity-50"
        />
        <Button onClick={() => void submit()} disabled={busy || !value.trim()}>
          <Send className="mr-2 h-4 w-4" aria-hidden />
          Simpan Momen
        </Button>
      </div>
      <p className="text-right text-[11px] text-text-secondary">{value.length}/280</p>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}