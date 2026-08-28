import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/Button";
import { getWhatsAppUrl } from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQ — TEMORA",
  description:
    "Pertanyaan yang sering diajukan soal TEMORA virtual photobooth: privasi foto, cara pakai, harga, perangkat, dan unduhan ZIP.",
};

const faqs = [
  {
    q: "Apa itu TEMORA?",
    a: "TEMORA adalah virtual photobooth untuk wedding, ulang tahun, dan acara spesial. Tamu scan kartu QR di meja, langsung buka kamera lewat browser HP tanpa install aplikasi apa pun, hasilnya terkumpul otomatis di galeri vendor.",
  },
  {
    q: "Apakah foto tamu aman privasinya?",
    a: "Aman. Foto hanya bisa dilihat oleh penyelenggara acara (vendor) — tamu tidak bisa melihat foto tamu lain. Foto otomatis dihapus paling lambat 30 hari setelah acara berakhir.",
  },
  {
    q: "Berapa harganya?",
    a: "Mulai gratis: 1 event aktif dengan 100 foto. Paket Basic Rp 49 ribu/bulan (3 event aktif, 500 foto/event) dan Pro Rp 299 ribu/bulan (unlimited). Detail lengkap ada di halaman Harga.",
  },
  {
    q: "HP tamu apa saja yang didukung?",
    a: "Semua HP dengan browser modern — iPhone maupun Android. Kamera depan untuk selfie bareng, belakang untuk suasana ruangan; frame acara dan watermark terpasang otomatis.",
  },
  {
    q: "Bagaimana kalau sinyal di venue lemah?",
    a: "Tetap tenang. Foto yang gagal terkirim masuk antrean offline di HP tamu dan terkirim ulang otomatis begitu koneksi kembali. Tidak ada momen yang hilang.",
  },
  {
    q: "Bagaimana vendor mengunduh semua fotonya?",
    a: "Dari galeri event, vendor menekan tombol unduh ZIP resolusi penuh. Untuk acara besar, proses berjalan di latar belakang dengan progres bar — tutup halaman pun aman, dilanjutkan nanti.",
  },
  {
    q: "Bisa pakai frame dengan logo kami sendiri?",
    a: "Bisa. Upload frame PNG transparan per event dari dashboard — logo, nama pasangan, atau tema acara tampil konsisten di setiap hasil foto tamu.",
  },
];

export default function FaqPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="space-y-2">
          <h1 className="font-display text-4xl leading-tight text-text-primary sm:text-5xl">
            Sering Ditanyakan
          </h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            Belum ketemu jawabannya? Hubungi kami via WhatsApp — dibalas manusia,
            bukan bot.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-bg-card px-5 py-4 open:bg-bg-base"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-text-primary [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="shrink-0 text-accent transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Button href={getWhatsAppUrl("Halo! Ada yang mau ditanyakan soal TEMORA.")}>
            Tanya via WhatsApp
          </Button>
          <Button href="/pricing" variant="secondary">
            Lihat Harga
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
