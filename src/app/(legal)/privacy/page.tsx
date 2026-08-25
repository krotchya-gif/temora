import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
};

const sections = [
  {
    title: "Data yang kami kumpulkan",
    body: [
      "TEMORA adalah layanan photobooth untuk acara. Tamu yang mengambil foto tidak perlu membuat akun dan tidak diminta data pribadi (nama, email, atau nomor telepon).",
      "Yang tersimpan dari setiap foto: gambar hasil capture, thumbnail kecil, waktu pengambilan, meja asal, serta penanda teknis untuk mencegah duplikat saat jaringan terputus.",
      "Vendor (penyelenggara) membuat akun dengan email, nama, dan — bila mengaktifkan notifikasi — nomor WhatsApp.",
    ],
  },
  {
    title: "Siapa yang bisa melihat foto",
    body: [
      "Foto tamu hanya bisa diakses oleh penyelenggara acara melalui dashboard mereka. Tamu tidak bisa melihat galeri atau foto orang lain.",
      "Tamu dapat menyimpan atau membagikan foto hasil tangkapannya sendiri langsung dari halaman photobooth.",
    ],
  },
  {
    title: "Retensi & penghapusan",
    body: [
      "Foto otomatis dihapus paling lambat 30 hari setelah masa berlaku acara berakhir, termasuk berkas gambarnya di server.",
      "Penyelenggara dapat menghapus foto individual sewaktu-waktu. Penghapusan permanen menyusul dalam siklus pembersihan harian.",
    ],
  },
  {
    title: "Tanpa facial recognition",
    body: [
      "Kami tidak menggunakan pengenalan wajah untuk mengidentifikasi siapa pun. Fitur efek visual apa pun bekerja sepenuhnya di perangkat tamu dan identitas tidak pernah dikirim atau disimpan.",
      "Tamu selalu melihat layar persetujuan sebelum kamera aktif, dan kamera hanya menyala setelah izin diberikan.",
    ],
  },
  {
    title: "Layanan pihak ketiga",
    body: [
      "Kami memakai penyedia infrastruktur untuk database, penyimpanan file, hosting, pembayaran (Xendit), dan notifikasi WhatsApp. Data hanya dibagikan sebatas yang diperlukan agar layanan berjalan.",
    ],
  },
  {
    title: "Hak kamu",
    body: [
      "Tamu anonim secara desain — karena kami tidak mengumpulkan identitas tamu, tidak ada profil yang bisa kami cari kembali.",
      "Penyelenggara dapat meminta salinan, koreksi, atau penghapusan data akunnya dengan menghubungi kami.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl text-text-primary">Kebijakan Privasi</h1>
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
