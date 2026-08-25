import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
};

const sections = [
  {
    title: "Tentang layanan",
    body: [
      "TEMORA menyediakan virtual photobooth untuk acara: penyelenggara membuat event, tamu mengambil foto lewat QR di meja tanpa aplikasi, dan semua foto terkumpul di dashboard penyelenggara.",
    ],
  },
  {
    title: "Akun vendor",
    body: [
      "Kamu bertanggung jawab menjaga kerahasiaan kredensial akunmu dan atas seluruh aktivitas yang terjadi di akun tersebut.",
      "Paket Free dapat dipakai tanpa biaya dengan batasan jumlah event aktif dan foto. Detail batasan ditampilkan di halaman paket.",
    ],
  },
  {
    title: "Konten & tanggung jawab penyelenggara",
    body: [
      "Sebagai penyelenggara, kamu bertanggung jawab atas foto yang dikumpulkan di event milikmu — termasuk memastikan tamu tahu bahwa kamera sedang digunakan dan foto tersimpan ke galeri acara.",
      "Dilarang menggunakan TEMORA untuk konten yang melanggar hukum, merendahkan, atau melanggar hak orang lain.",
    ],
  },
  {
    title: "Pembayaran",
    body: [
      "Upgrade paket ditagih melalui mitra pembayaran Xendit dalam Rupiah. Langganan berlaku 30 hari sejak pembayaran terkonfirmasi dan tidak diperpanjang otomatis — perpanjangan dilakukan manual.",
      "Batasan paket berlaku berdasarkan tier saat event dibuat; upgrade tidak mengubah kuota event yang sudah ada.",
    ],
  },
  {
    title: "Ketersediaan & perubahan",
    body: [
      "Kami berupaya menjaga layanan tetap tersedia, tetapi TEMORA disediakan \"sebagaimana adanya\" tanpa jaminan layanan tanpa gangguan. Kami dapat memperbarui syarat ini sewaktu-waktu; perubahan material akan kami informasikan di halaman ini.",
    ],
  },
];

export default function TermsPage() {
  return (
    <MarketingLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl text-text-primary">
          Syarat &amp; Ketentuan
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Terakhir diperbarui: 26 Agustus 2026 · review hukum formal menyusul.
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl text-text-primary">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 24)}
                    className="text-[15px] leading-relaxed text-text-secondary"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </MarketingLayout>
  );
}
