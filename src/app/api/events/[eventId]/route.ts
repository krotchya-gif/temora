import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removePrefix } from "@/lib/storage";
import { TIER_ACTIVE_EVENT_LIMITS } from "@/lib/constants";
import { eventUpdateSchema, firstIssueMessage } from "@/lib/validation/event";

export const runtime = "nodejs";

type VendorTier = "free" | "basic" | "pro";

async function resolveOwnedEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" as const };

  // RLS e_owner: event vendor lain tidak terlihat.
  const { data: event } = await supabase
    .from("events")
    .select("id, vendor_id, name, slug, theme, starts_at, ends_at, location, is_active, photo_limit, expires_at, cover_template, cover_image_url, cover_title, cover_subtitle, cover_button_text, watermark_text, watermark_position, camera_preset, filter_id, filter_strength, qr_template, qr_title, qr_subtitle, qr_tagline")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "notfound" as const };
  return { supabase, event };
}

// GET — detail event (data form edit + ringkasan).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const result = await resolveOwnedEvent(eventId);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error === "auth" ? "Silakan login dulu." : "Event tidak ditemukan." },
      { status: result.error === "auth" ? 401 : 404 },
    );
  }
  return NextResponse.json({ ok: true, event: result.event });
}

// PUT — update event; slug immutable; aktivasi divalidasi tier server-side.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;
  const result = await resolveOwnedEvent(eventId);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error === "auth" ? "Silakan login dulu." : "Event tidak ditemukan." },
      { status: result.error === "auth" ? 401 : 404 },
    );
  }
  const { supabase, event } = result;

  const body = await request.json().catch(() => null);
  const parsed = eventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;
  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  // Watermark kustom (teks/posisi) khusus tier Pro — defense in depth (PRD §3).
  if (input.watermarkText !== undefined || input.watermarkPosition !== undefined) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("subscription_tier")
      .eq("id", event.vendor_id)
      .single();
    const tier = (vendor?.subscription_tier ?? "free") as VendorTier;
    if (tier !== "pro") {
      return NextResponse.json(
        { error: "Watermark kustom (teks & posisi) tersedia di paket Pro ya." },
        { status: 403 },
      );
    }
  }

  // Aktivasi ulang → cek kuota event aktif per tier (kecuali event ini sendiri sudah aktif).
  if (input.isActive === true && !event.is_active) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("subscription_tier")
      .eq("id", event.vendor_id)
      .single();
    const tier = (vendor?.subscription_tier ?? "free") as VendorTier;
    const max = TIER_ACTIVE_EVENT_LIMITS[tier];

    if (max !== null) {
      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", event.vendor_id)
        .eq("is_active", true)
        .neq("id", event.id);

      if ((count ?? 0) >= max) {
        return NextResponse.json(
          {
            error: `Paketmu mengizinkan ${max} event aktif. Nonaktifkan salah satu dulu, atau upgrade paketnya ya.`,
          },
          { status: 403 },
        );
      }
    }
  }

  // Slug sengaja tidak ada di schema update — immutable setelah dibuat.
  // Mapping camelCase (API) → snake_case (kolom DB); hanya field yang dikirim.
  const dbInput: Record<string, unknown> = {
    name: input.name,
    theme: input.theme,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: input.location,
    is_active: input.isActive,
    watermark_text:
      input.watermarkText === undefined
        ? undefined
        : input.watermarkText,
    watermark_position: input.watermarkPosition,
    cover_template: input.coverTemplate,
    cover_image_url: input.coverImageUrl,
    cover_title: input.coverTitle,
    cover_subtitle: input.coverSubtitle,
    cover_button_text: input.coverButtonText,
    camera_preset: input.cameraPreset,
    filter_id: input.filterId,
    filter_strength: input.filterStrength,
    qr_template: input.qrTemplate,
    qr_title: input.qrTitle,
    qr_subtitle: input.qrSubtitle,
    qr_tagline: input.qrTagline,
  };
  const changes = Object.fromEntries(
    Object.entries(dbInput).filter(([, v]) => v !== undefined),
  );

  const { error } = await supabase.from("events").update(changes).eq("id", event.id);
  if (error) {
    console.error("[events.update]", error.message);
    return NextResponse.json(
      { error: "Gagal menyimpan perubahan. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

// DELETE — hapus event (row cascade via FK) + purge objek Storage terkait.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;
  const result = await resolveOwnedEvent(eventId);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error === "auth" ? "Silakan login dulu." : "Event tidak ditemukan." },
      { status: result.error === "auth" ? 401 : 404 },
    );
  }
  const { event } = result;

  const admin = createAdminClient();

  const { error } = await admin.from("events").delete().eq("id", event.id);
  if (error) {
    console.error("[events.delete]", error.message);
    return NextResponse.json(
      { error: "Gagal menghapus event. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  // Cascade row (tables/photos) lewat FK; bersihkan objek Storage.
  // MVP: purge langsung di request (volume wajar); job async menyusul bila perlu.
  try {
    await removePrefix(admin, "photos", event.id);
    await removePrefix(admin, "thumbs", event.id);
    await removePrefix(admin, "frames", `${event.vendor_id}/${event.id}`);
    await removePrefix(admin, "covers", `${event.vendor_id}/${event.id}`);
    await removePrefix(admin, "zips", event.id);
  } catch (err) {
    console.error("[events.delete] storage purge:", err);
  }

  return NextResponse.json({ ok: true });
}
