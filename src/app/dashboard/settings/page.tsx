import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "Pengaturan",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Pengaturan</h1>
        <p className="text-sm text-text-secondary">
          Profil vendor & notifikasi WhatsApp.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-text-primary">Profil</h2>
        <Input label="Nama" name="name" placeholder="Nama kamu atau studio" />
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="nama@contoh.com"
          hint="Email login tidak bisa diubah di versi ini."
        />
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg text-text-primary">Notifikasi WhatsApp</h2>
        <Input
          label="Nomor WhatsApp"
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="6281234567890"
          hint="Format E.164 (62…)"
        />
        <label className="flex items-start gap-3 text-sm text-text-secondary">
          <input
            type="checkbox"
            name="wa_opt_in"
            defaultChecked
            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-dusty-blue"
          />
          <span>
            Terima notifikasi WhatsApp tentang event dan pembayaran.
            <br />
            <span className="text-xs">Maksimal 3 pesan per hari, tanpa kirim jam 22.00–07.00 WIB.</span>
          </span>
        </label>
      </Card>

      <div className="space-y-2">
        <Button className="w-full" disabled>
          Simpan Perubahan
        </Button>
        <p className="text-center text-xs text-text-secondary">
          Menyimpan pengaturan aktif setelah koneksi database siap.
        </p>
      </div>
    </div>
  );
}
