import { appUrl } from "@/lib/seo-settings";

// GET /llms.txt — file statis untuk AI crawler / GEO (BRAND.md §10,
// docs/research/seo-admin-reference.md §2). Sengaja statis (tanpa key admin
// baru) sehingga tanpa migration; sitemap/robots yang dinamis tetap lewat
// platform_settings.
export async function GET() {
  const base = appUrl().origin;

  const body = `# TEMORA

> Virtual photobooth untuk wedding, ulang tahun, gathering, dan corporate event.
> Tamu scan QR di meja, langsung buka kamera lewat browser HP tanpa install aplikasi.
> Foto terkumpul real-time di galeri vendor dan bisa diunduh sebagai ZIP.

Tagline: Keep the moments close.

## Halaman publik

- Beranda: ${base}/
- Cara kerja: ${base}/how-it-works
- Galeri kurasi: ${base}/moments
- Paket & harga: ${base}/pricing
- FAQ: ${base}/faq
- Kebijakan privasi: ${base}/privacy
- Syarat & ketentuan: ${base}/terms

## Fakta kunci

- Tanpa install app: kamera berjalan di browser HP tamu (iOS & Android).
- Frame PNG transparan kustom per event; watermark "Keep it close. Keep it TEMORA."
- Antrean offline: foto gagal terkirim otomatis dikirim ulang saat koneksi kembali.
- Paket: Free (1 event aktif, 100 foto), Basic (Rp 49 ribu/bulan), Pro (Rp 299 ribu/bulan).
- Pembayaran: Xendit (IDR). Kontak vendor: WhatsApp via tombol di situs.
- Privasi: foto tamu hanya dilihat penyelenggara; tanpa akun tamu; tanpa facial
  recognition; foto otomatis dihapus maksimal 30 hari setelah acara berakhir.

## Sitemap & robots

- Sitemap: ${base}/sitemap.xml
- Robots: ${base}/robots.txt
`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
