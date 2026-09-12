import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pengaturan",
};

// Data per-sesi vendor — selalu render dinamis.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("name, email")
    .eq("id", user?.id ?? "")
    .single();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Pengaturan</h1>
        <p className="text-sm text-text-secondary">
          Profil vendor.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-text-primary">Profil</h2>
        <Input label="Nama" name="name" value={vendor?.name ?? ""} disabled />
        <Input
          label="Email"
          name="email"
          type="email"
          value={vendor?.email ?? ""}
          hint="Email login tidak bisa diubah di versi ini."
          disabled
        />
      </Card>
    </div>
  );
}
