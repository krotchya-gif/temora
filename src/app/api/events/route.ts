import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import {
  TIER_ACTIVE_EVENT_LIMITS,
  TIER_PHOTO_LIMITS,
} from "@/lib/constants";
import { enqueueWa } from "@/lib/whatsapp";
import { SLUG_PATTERN, eventCreateSchema, firstIssueMessage } from "@/lib/validation/event";

export const runtime = "nodejs";

type VendorTier = "free" | "basic" | "pro";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base.length >= 6 ? base : `${base}-temora`.slice(0, 60);
}

function shortSuffix(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => "0123456789abcdefghijklmnopqrstuvwxyz"[b % 36])
    .join("");
}

/** Cek limit event aktif per tier (database.md §2.7). Return pesan ramah bila blokir. */
async function activeLimitError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vendorId: string,
  tier: VendorTier,
): Promise<string | null> {
  const max = TIER_ACTIVE_EVENT_LIMITS[tier];
  if (max === null) return null;

  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .eq("is_active", true);

  if ((count ?? 0) >= max) {
    return `Paketmu mengizinkan ${max} event aktif. Nonaktifkan salah satu dulu, atau upgrade paketnya ya.`;
  }
  return null;
}

// GET /api/events — list event milik vendor (card data, task 007 §2).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  // RLS e_owner: hanya baris milik vendor.
  type EventRow = {
    id: string;
    name: string;
    slug: string;
    theme: string | null;
    starts_at: string | null;
    is_active: boolean;
    photos: { count: number }[] | null;
  };
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, slug, theme, starts_at, is_active, photos(count)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[events.list]", error.message);
    return NextResponse.json(
      { error: "Gagal memuat daftar event." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as unknown as EventRow[];
  return NextResponse.json({
    events: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      theme: row.theme,
      startsAt: row.starts_at,
      isActive: row.is_active,
      photoCount: row.photos?.[0]?.count ?? 0,
    })),
  });
}

// POST /api/events — buat event (tier check server-side + photo_limit dari tier).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = eventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, subscription_tier")
    .eq("id", user.id)
    .single();

  if (!vendor) {
    return NextResponse.json(
      { error: "Profil vendor tidak ditemukan. Coba login ulang ya." },
      { status: 401 },
    );
  }

  const tier = (vendor.subscription_tier ?? "free") as VendorTier;

  // Watermark kustom (teks/posisi) khusus tier Pro — defense in depth (PRD §3).
  if (tier !== "pro" && (input.watermarkText !== undefined || input.watermarkPosition !== undefined)) {
    return NextResponse.json(
      { error: "Watermark kustom (teks & posisi) tersedia di paket Pro ya." },
      { status: 403 },
    );
  }

  if (input.isActive !== false) {
    const block = await activeLimitError(supabase, vendor.id, tier);
    if (block) {
      return NextResponse.json({ error: block }, { status: 403 });
    }
  }

  // Slug: custom divalidasi unik; kosong → auto dari nama + suffix pendek bila bentrok.
  let slug: string;
  if (input.customSlug) {
    if (!SLUG_PATTERN.test(input.customSlug)) {
      return NextResponse.json(
        { error: "Pakai huruf kecil, angka, dan tanda hubung (6–60 karakter)." },
        { status: 400 },
      );
    }
    const { data: taken } = await supabase
      .from("events")
      .select("id")
      .eq("slug", input.customSlug)
      .maybeSingle();
    if (taken) {
      return NextResponse.json(
        { error: "Link kustom itu sudah dipakai. Coba yang lain, ya." },
        { status: 409 },
      );
    }
    slug = input.customSlug;
  } else {
    const base = slugify(input.name);
    slug = base;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: taken } = await supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${base}-${shortSuffix()}`;
    }
    // Cek terakhir setelah loop
    const { data: finalTaken } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (finalTaken) {
      return NextResponse.json(
        { error: "Nama event ini sudah sering dipakai. Coba nama lain atau isi link kustom, ya." },
        { status: 409 },
      );
    }
  }

  // TTL foto default 30 hari (database.md §2.2); photo_limit dari tier saat create.
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();

  const { data: created, error } = await supabase
    .from("events")
    .insert({
      vendor_id: vendor.id,
      name: input.name,
      slug,
      theme: input.theme ?? "other",
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      location: input.location || null,
      is_active: input.isActive !== false,
      expires_at: expiresAt,
      photo_limit: TIER_PHOTO_LIMITS[tier],
      watermark_text: input.watermarkText,
      watermark_position: input.watermarkPosition,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[events.create]", error?.message);
    return NextResponse.json(
      { error: "Gagal menyimpan event. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  // WA "event_created" masuk antrean (dikirim worker task 009, quiet hours §4.4).
  void enqueueWa(vendor.id, "event_created", { eventName: input.name });

  return NextResponse.json({ ok: true, eventId: created.id });
}
