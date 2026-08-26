import { NextResponse } from "next/server";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/admin/utm/report — kunjungan per source kampanye + konversi dari
// subscriptions.utm_source (adaptasi join orders.utm_source — referensi seo.md §4.5).
export async function GET() {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const [{ data: visits }, { data: conversions }] = await Promise.all([
    admin
      .from("utm_visits")
      .select("utm_source, utm_medium, utm_campaign")
      .order("created_at", { ascending: false })
      .limit(5000),
    admin
      .from("subscriptions")
      .select("utm_source, status")
      .not("utm_source", "is", null),
  ]);

  const bySource = new Map<string, { visits: number; conversions: number }>();
  for (const row of visits ?? []) {
    const key = row.utm_source || "(tanpa source)";
    const entry = bySource.get(key) ?? { visits: 0, conversions: 0 };
    entry.visits += 1;
    bySource.set(key, entry);
  }
  for (const row of conversions ?? []) {
    const key = row.utm_source || "(tanpa source)";
    const entry = bySource.get(key) ?? { visits: 0, conversions: 0 };
    entry.conversions += 1;
    bySource.set(key, entry);
  }

  const rows = Array.from(bySource.entries())
    .map(([source, counts]) => ({ source, ...counts }))
    .sort((a, b) => b.visits - a.visits);

  return NextResponse.json({ rows });
}