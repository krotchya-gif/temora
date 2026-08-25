import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "Event Baru",
};

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Buat event baru</h1>
        <p className="text-sm text-text-secondary">
          Nama event dan link kustom bisa disiapkan sekarang.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <Input label="Nama event" name="name" placeholder="Pernikahan Andi & Sinta" />
        <Input
          label="Link kustom (opsional)"
          name="slug"
          hint="Kosongkan untuk otomatis dari nama event."
        />
        <div className="space-y-2 pt-2">
          <Button className="w-full" disabled>
            Simpan Event
          </Button>
          <p className="text-center text-xs text-text-secondary">
            Menyimpan event aktif setelah koneksi database siap.
          </p>
        </div>
      </Card>
    </div>
  );
}
