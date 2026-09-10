import type { Metadata } from "next";
import { cache } from "react";
import { PhotoboothExperience } from "@/components/photobooth/PhotoboothExperience";
import { isUuid, type PhotoboothEvent, type PhotoboothTable } from "@/lib/events";
import { createAdminClient } from "@/lib/supabase/admin";

type PhotoboothPageProps = {
  params: Promise<{ eventId: string; tableId: string }>;
};

export async function generateMetadata({
  params,
}: PhotoboothPageProps): Promise<Metadata> {
  const { eventId, tableId } = await params;
  const state = await loadPhotoboothState(eventId, tableId);
  return {
    title: state.status === "ready" ? state.event.name : "TEMORA",
    robots: { index: false },
  };
}

export default async function PhotoboothPage({ params }: PhotoboothPageProps) {
  const { eventId, tableId } = await params;
  const state = await loadPhotoboothState(eventId, tableId);

  if (state.status === "ended") {
    return <EndedScreen />;
  }
  if (state.status === "invalid") {
    return <InvalidLinkScreen />;
  }
  if (state.status === "error") {
    return (
      <LoadErrorScreen
        retryHref={`/p/${encodeURIComponent(eventId)}/${encodeURIComponent(tableId)}`}
      />
    );
  }

  const { event, table, remaining, frameSponsors } = state;

  return (
    <PhotoboothExperience
      event={event}
      tableId={table.id}
      tableLabel={table.label}
      remaining={remaining}
      frameSponsors={frameSponsors}
    />
  );
}

// generateMetadata + render memakai hasil query yang sama (React cache).
const loadPhotoboothState = cache(
  async (eventIdParam: string, tableIdParam: string) => {
  if (!isUuid(tableIdParam)) return { status: "invalid" as const };

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[photobooth.load] admin client unavailable", error);
    return { status: "error" as const };
  }

  const { data: row, error: eventError } = await admin
    .from("events")
    .select("id, name, slug, theme, frame_url, watermark_text, watermark_position, is_active, expires_at")
    .eq(isUuid(eventIdParam) ? "id" : "slug", eventIdParam)
    .maybeSingle();

  if (eventError) {
    console.error("[photobooth.load] event lookup failed", eventError.message);
    return { status: "error" as const };
  }
  if (!row) return { status: "invalid" as const };
  if (
    !row.is_active ||
    (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())
  ) {
    return { status: "ended" as const };
  }

  const event: PhotoboothEvent = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    theme: row.theme,
    frameUrl: row.frame_url,
    watermarkText: row.watermark_text,
    watermarkPosition: row.watermark_position ?? "bottom-right",
  };

  const { data: tableRow, error: tableError } = await admin
    .from("tables")
    .select("id, label")
    .eq("id", tableIdParam)
    .eq("event_id", event.id)
    .maybeSingle();

  if (tableError) {
    console.error("[photobooth.load] table lookup failed", tableError.message);
    return { status: "error" as const };
  }
  if (!tableRow) return { status: "invalid" as const };
  const table: PhotoboothTable = tableRow;

  // Sisa kuota untuk UX (tombol capture nonaktif saat habis).
  // Gagal membaca → null dianggap unlimited; server tetap memvalidasi.
  let remaining: number | null = null;
  try {
    const { data: eventData } = await admin
      .from("events")
      .select("photo_limit")
      .eq("id", event.id)
      .single();
    if (eventData && eventData.photo_limit !== null) {
      const { count } = await admin
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .is("deleted_at", null);
      remaining = Math.max(0, (eventData.photo_limit ?? 0) - (count ?? 0));
    }
  } catch {
    remaining = null;
  }

  // Sponsor aktif (task 013): frame → consent + capture; qr → kartu print.
  // Sponsor hanya field publik; gagal baca tidak memblokir photobooth.
  let frameSponsors: { id: string; name: string; logo_path: string | null }[] = [];
  try {
    const { data: sponsorRows } = await admin
      .from("sponsors")
      .select("id, name, logo_path, position")
      .eq("event_id", event.id)
      .eq("is_active", true);
    frameSponsors = (sponsorRows ?? []).filter((s) => s.position === "frame");
  } catch {
    // env tidak siap → tanpa sponsor, halaman tetap jalan.
  }

  return { status: "ready" as const, event, table, remaining, frameSponsors };
  },
);

function EndedScreen() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-base bg-glow-accent">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-4xl leading-tight text-text-primary">
          Acara ini sudah selesai
        </p>
        <p className="max-w-sm text-[15px] leading-relaxed text-text-secondary">
          Terima kasih sudah jadi bagian dari momennya.
        </p>
      </div>
      <footer className="px-4 pb-8 text-center">
        <p className="font-display text-sm italic tracking-wide text-text-secondary">
          Keep it close. Keep it TEMORA.
        </p>
      </footer>
    </main>
  );
}

function InvalidLinkScreen() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-base">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-3xl leading-tight text-text-primary">
          Tautan tidak ditemukan
        </p>
        <p className="max-w-sm text-[15px] leading-relaxed text-text-secondary">
          Sepertinya tautan ini tidak tepat. Coba scan ulang QR di mejamu, ya.
        </p>
      </div>
      <footer className="px-4 pb-8 text-center">
        <p className="font-display text-sm italic tracking-wide text-text-secondary">
          Keep it close. Keep it TEMORA.
        </p>
      </footer>
    </main>
  );
}

function LoadErrorScreen({ retryHref }: { retryHref: string }) {
  return (
    <main className="flex min-h-dvh flex-col bg-bg-base">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-3xl leading-tight text-text-primary">
          Momennya belum bisa dibuka
        </p>
        <p className="max-w-sm text-[15px] leading-relaxed text-text-secondary">
          Coba muat ulang sebentar lagi, ya.
        </p>
        <a
          href={retryHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white"
        >
          Coba lagi
        </a>
      </div>
      <footer className="px-4 pb-8 text-center">
        <p className="font-display text-sm italic tracking-wide text-text-secondary">
          Keep it close. Keep it TEMORA.
        </p>
      </footer>
    </main>
  );
}
