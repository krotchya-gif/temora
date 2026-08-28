import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EventForm } from "@/components/dashboard/EventForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Event Baru",
};

// Form kirim ke API dengan cookie sesi — render dinamis.
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tier = (user
    ? ((await supabase
        .from("vendors")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle())?.data?.subscription_tier ?? "free")
    : "free") as "free" | "basic" | "pro";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/dashboard/events"
        className="inline-flex text-sm text-text-secondary transition-colors hover:text-accent"
      >
        ← Semua event
      </Link>

      <div>
        <h1 className="font-display text-3xl text-text-primary">Buat event baru</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Nama event dan link kustom tidak bisa diganti setelah dibuat — pastikan
          sudah pas ya.
        </p>
      </div>

      <Card className="p-6">
        <EventForm mode="create" tier={tier} />
      </Card>
    </div>
  );
}