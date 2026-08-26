import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Pengaturan Platform — TEMORA Admin",
};
export const dynamic = "force-dynamic";

// Pengaturan platform level-admin (task sosial media): KV platform_settings.
export default async function AdminSettingsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["social_instagram", "social_tiktok", "social_facebook"]);

  const get = (key: string) =>
    (data ?? []).find((row) => row.key === key)?.value ?? "";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Pengaturan</h1>
        <p className="text-sm text-text-secondary">
          Konfigurasi platform yang tampil di halaman publik.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">
          Sosial Media Footer
        </h2>
        <SocialSettingsForm
          initial={{
            instagram: get("social_instagram"),
            tiktok: get("social_tiktok"),
            facebook: get("social_facebook"),
          }}
        />
      </Card>
    </div>
  );
}
