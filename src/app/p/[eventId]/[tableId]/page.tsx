import type { Metadata } from "next";
import { cache } from "react";
import { PhotoboothExperience } from "@/components/photobooth/PhotoboothExperience";
import { isUuid, type PhotoboothEvent, type PhotoboothTable } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

type PhotoboothPageProps = {
  params: Promise<{ eventId: string; tableId: string }>;
};

export async function generateMetadata({
  params,
}: PhotoboothPageProps): Promise<Metadata> {
  const { eventId, tableId } = await params;
  const state = await loadPhotoboothState(eventId, tableId);
  return {
    title: state?.event.name ?? "TEMORA",
    robots: { index: false },
  };
}

export default async function PhotoboothPage({ params }: PhotoboothPageProps) {
  const { eventId, tableId } = await params;
  const state = await loadPhotoboothState(eventId, tableId);

  // RLS anon hanya mengembalikan event aktif & belum expired —
  // selain itu tamu melihat layar perpisahan yang sopan (task 004 §2).
  if (!state) {
    return <EndedScreen />;
  }
  if (!state.table) {
    return <InvalidLinkScreen />;
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
  let client;
  try {
    client = await createClient();
  } catch {
    return null; // env Supabase belum terpasang → layar ended, tanpa crash
  }

  const { data: row } = await client
    .from("events")
    .select("id, name, slug, theme, frame_url, watermark_text")
    .eq(isUuid(eventIdParam) ? "id" : "slug", eventIdParam)
    .maybeSingle();

  if (!row) return null;

  const event: PhotoboothEvent = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    theme: row.theme,
    frameUrl: row.frame_url,
    watermarkText: row.watermark_text ?? "Keep it close. Keep it TEMORA.",
  };

  const { data: tableRow } = await client
    .from("tables")
    .select("id, label")
    .eq("id", tableIdParam)
    .eq("event_id", event.id)
    .maybeSingle();

  const table: PhotoboothTable | null = tableRow;

  // Sisa kuota untuk UX (tombol capture nonaktif saat habis).
  // Gagal membaca → null dianggap unlimited; server tetap memvalidasi.
  let remaining: number | null = null;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
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
  // RLS sp_public_read: hanya baris aktif; gagal baca → tanpa sponsor (tidak memblok).
  let frameSponsors: { id: string; name: string; logo_path: string | null }[] = [];
  try {
    const { data: sponsorRows } = await client
      .from("sponsors")
      .select("id, name, logo_path, position")
      .eq("event_id", event.id)
      .eq("is_active", true);
    frameSponsors = (sponsorRows ?? []).filter((s) => s.position === "frame");
  } catch {
    // env tidak siap → tanpa sponsor, halaman tetap jalan.
  }

  return { event, table, remaining, frameSponsors };
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
