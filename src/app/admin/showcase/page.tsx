import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { ShowcaseUploadForm } from "@/components/admin/ShowcaseUploadForm";
import { ShowcaseList } from "@/components/admin/ShowcaseList";
import { createAdminClient } from "@/lib/supabase/admin";
import { momentImageUrl } from "@/lib/moments";

export const metadata: Metadata = {
  title: "Showcase Moments — TEMORA Admin",
};
export const dynamic = "force-dynamic";

// Kurasi galeri publik /moments + sumber rope landing (docs/qa-report.md §7).
export default async function AdminShowcasePage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("showcase_photos")
    .select("id, storage_path, external_url, title, caption")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const items = (data ?? []).map((row) => ({
    id: row.id,
    url: momentImageUrl(row, publicBase),
    title: row.title,
    caption: row.caption,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Showcase Moments</h1>
        <p className="text-sm text-text-secondary">
          Foto kurasi platform — tampil di landing (tali momen) dan halaman
          publik <span className="font-mono">/moments</span>. Gunakan foto
          berizin, bukan foto tamu vendor.
        </p>
      </div>

      <ShowcaseUploadForm />

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">
          Koleksi ({items.length})
        </h2>
        <ShowcaseList items={items} />
      </Card>
    </div>
  );
}
