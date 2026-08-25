import { Camera } from "lucide-react";
import { Card } from "@/components/ui/Card";

type PhotoboothPlaceholderProps = {
  params: Promise<{ eventId: string; tableId: string }>;
};

export default async function PhotoboothPlaceholderPage({
  params,
}: PhotoboothPlaceholderProps) {
  const { eventId, tableId } = await params;

  return (
    <div className="flex min-h-dvh flex-col bg-bg-base">
      <header className="border-b border-border px-4 py-5 text-center">
        <p className="font-display text-2xl text-text-primary">Event Preview</p>
        <p className="mt-0.5 text-sm text-text-secondary">
          Meja · {tableId.slice(0, 8)}…
        </p>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        <Card className="flex aspect-[3/4] w-full max-w-xs -rotate-1 flex-col items-center justify-center gap-3 bg-bg-warm p-6 motion-reduce:rotate-0">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-card shadow-soft">
            <Camera className="h-6 w-6 text-accent" aria-hidden />
          </span>
          <p className="max-w-[210px] text-center text-sm leading-relaxed text-text-secondary">
            Kamera belum aktif di versi ini. Halaman photobooth sedang
            disiapkan.
          </p>
        </Card>

        <div className="space-y-2 text-center">
          <button
            type="button"
            disabled
            aria-label="Ambil Momen"
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent opacity-50 ring-4 ring-bg-card shadow-card"
          />
          <p className="text-sm text-text-secondary">Tap untuk ambil momen</p>
        </div>

        <p className="font-mono text-xs text-text-secondary">
          /p/{eventId}/{tableId}
        </p>
      </main>

      <footer className="px-4 pb-8 text-center">
        <p className="font-display text-sm italic text-text-secondary">
          Keep it close. Keep it TEMORA.
        </p>
      </footer>
    </div>
  );
}
