import type { Metadata } from "next";
import Image from "next/image";
import QRCode from "qrcode";
import {
  ArrowDown,
  ArrowRight,
  Camera,
  Check,
  Download,
  QrCode,
  Sparkles,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { GUEST_PLACEHOLDER_PHOTO } from "@/components/photobooth/GuestPhoneMockup";
import { Button } from "@/components/ui/Button";
import { getWhatsAppUrl, HOW_IT_WORKS_STEPS, TOKEN_HEX } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Cara Kerja TEMORA Virtual Photobooth",
  description:
    "Dari scan QR di meja sampai galeri foto bersama—TEMORA membuat tamu bisa menyimpan momen langsung dari browser, tanpa aplikasi.",
};

const stepIcons = {
  qr: QrCode,
  camera: Camera,
  gallery: Download,
} as const;

const stepNotes = [
  [
    ["Kartu siap cetak", "Pilih desain kartu yang cocok dengan suasana event."],
    ["Bagikan ke WhatsApp", "Kirim kartu atau link yang sama langsung ke grup tamu."],
    ["Tanpa akun tamu", "Satu kali scan langsung membuka kamera event di browser."],
  ],
  [
    ["Frame milik event", "Visual kamera mengikuti tampilan yang sudah diatur pemilik event."],
    ["Filter konsisten", "Preset yang dipilih diterapkan ke preview dan hasil foto."],
    ["Jatah selalu terlihat", "Tamu tahu berapa momen yang masih bisa mereka ambil."],
  ],
  [
    ["Terkumpul real-time", "Foto dari setiap meja langsung masuk ke satu galeri event."],
    ["Unduh sekali klik", "Vendor dapat mengunduh semua hasil sebagai satu berkas ZIP."],
    ["Siap dibagikan", "Pilih momen favorit lalu simpan kembali ke galeri HP."],
  ],
] as const;

function StepVisual({ stepIndex, qrDataUrl }: { stepIndex: number; qrDataUrl: string }) {
  if (stepIndex === 0) {
    return (
      <div className="relative mx-auto aspect-[4/5] w-full max-w-xs rotate-[-2deg] rounded-[2rem] border border-border bg-bg-card p-5 shadow-card sm:p-7">
        <div className="flex items-center justify-between border-b border-border pb-4 text-[10px] uppercase tracking-[0.22em] text-text-secondary">
          <span>TEMORA</span><span>Kartu meja</span>
        </div>
        <div className="flex h-[72%] flex-col items-center justify-center text-center">
          <div className="grid aspect-square w-[58%] place-items-center rounded-2xl bg-bg-warm text-text-primary ring-1 ring-border">
            <Image src={qrDataUrl} alt="Contoh QR menuju kamera event TEMORA" width={220} height={220} unoptimized className="h-[78%] w-[78%]" />
          </div>
          <p className="mt-5 text-[10px] uppercase tracking-[0.26em] text-text-secondary">Scan &amp; jepret</p>
          <p className="mt-2 font-display text-2xl text-text-primary">mari bersama</p>
          <p className="mt-1 text-xs text-text-secondary">Buka kamera tamu</p>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-text-secondary">
          <span>MEJA 01</span><span>Keep it close.</span>
        </div>
      </div>
    );
  }

  if (stepIndex === 1) {
    return (
      <div className="relative mx-auto w-72 max-w-full rounded-[3rem] border-[6px] border-text-primary bg-text-primary p-1.5 shadow-card">
        <div className="overflow-hidden rounded-[2.35rem]">
          <Image
            src="/images/guest-camera-ui-mockup.png"
            alt="Tampilan kamera tamu TEMORA dengan frame event dan kontrol foto"
            width={379}
            height={762}
            sizes="288px"
            className="h-auto w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-xs rounded-[2rem] bg-text-primary p-6 text-bg-base shadow-card sm:p-8">
      <div className="flex items-center justify-between border-b border-bg-base/15 pb-5 text-[10px] uppercase tracking-[0.22em] text-bg-base/60">
        <span>Galeri event</span><span>Live</span>
      </div>
      <div className="mt-6 grid grid-cols-[1.2fr_0.8fr] gap-3">
        <div className="relative row-span-2 aspect-[3/4] overflow-hidden rounded-xl">
          <Image src={GUEST_PLACEHOLDER_PHOTO} alt="Foto utama pada contoh galeri TEMORA" fill sizes="240px" className="object-cover" />
        </div>
        {["object-left", "object-right"].map((position, index) => (
          <div key={position} className="relative overflow-hidden rounded-xl">
            <Image src={GUEST_PLACEHOLDER_PHOTO} alt={`Foto ${index + 2} pada contoh galeri TEMORA`} fill sizes="150px" className={`object-cover ${position}`} />
            <span className="absolute bottom-2 left-2 font-mono text-[9px] text-bg-base/80">0{index + 2}</span>
          </div>
        ))}
      </div>
      <div className="mt-7 flex items-center justify-between rounded-xl bg-bg-base/10 px-4 py-3 text-sm">
        <span>Semua momen terkumpul</span><Download className="h-4 w-4" aria-hidden />
      </div>
    </div>
  );
}

export default async function HowItWorksPage() {
  const qrDataUrl = await QRCode.toDataURL("https://temora.site/p/demo/meja-01", {
    width: 440,
    margin: 1,
    color: { dark: TOKEN_HEX.textPrimary, light: TOKEN_HEX.bgCard },
  });

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b border-border bg-bg-warm">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full border border-accent-secondary/25" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full border border-accent-secondary/20" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-end lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Cara kerja</p>
            <h1 className="mt-5 max-w-xl font-display text-5xl leading-[0.95] text-text-primary sm:text-7xl">
              Tiga langkah, lalu biarkan momennya berjalan.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg">
              Dari kartu QR di meja sampai galeri bersama. Tamu tidak perlu install apa pun—cukup buka kamera, jepret, dan kembali menikmati acara.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/signup" size="lg">
                Buat event gratis <Sparkles className="h-4 w-4" aria-hidden />
              </Button>
              <a href="#langkah" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-base hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue">
                Lihat alurnya <ArrowDown className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
          <div className="flex items-end justify-between gap-6 lg:justify-end">
            <div className="hidden pb-3 text-right sm:block">
              <p className="font-display text-4xl text-text-primary">Tanpa app.</p>
              <p className="mt-1 max-w-[12rem] text-sm leading-relaxed text-text-secondary">Semua langsung dari browser HP tamu.</p>
            </div>
            <div className="relative w-72 max-w-full shrink-0 pb-7 pt-4 sm:w-80">
              <div className="absolute left-1/2 top-1/2 h-[88%] w-[82%] -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-[1.5rem] border border-border bg-bg-card shadow-soft" aria-hidden />
              <figure className="relative -rotate-2 rounded-[1.5rem] bg-bg-card p-3 pb-10 shadow-card transition-transform duration-300 hover:rotate-0 motion-reduce:transition-none">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                  <Image src={GUEST_PLACEHOLDER_PHOTO} alt="Sekelompok teman mengabadikan momen bersama" fill priority sizes="(min-width: 640px) 320px, 72vw" className="object-cover" />
                </div>
                <figcaption className="absolute inset-x-4 bottom-3 text-center font-display text-lg italic text-text-secondary">malam yang ingin disimpan.</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section id="langkah" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-16 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Alurnya sederhana</p>
            <h2 className="mt-3 font-display text-4xl text-text-primary sm:text-5xl">Dari scan sampai tersimpan.</h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-text-secondary">Pemilik event mengatur tampilannya. Tamu tinggal menikmati momennya.</p>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const Icon = stepIcons[step.icon];
            const isReversed = index === 1;
            return (
              <article key={step.step} className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
                <div className={isReversed ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm tracking-[0.18em] text-accent">{step.step}</span>
                    <span className="h-px w-12 bg-border" aria-hidden />
                    <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} aria-hidden />
                  </div>
                  <h3 className="mt-6 max-w-md font-display text-4xl leading-tight text-text-primary sm:text-5xl">{step.title}</h3>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-text-secondary">{step.description}</p>
                  <ul className="mt-7 space-y-3">
                    {stepNotes[index].map((note) => (
                      <li key={note[0]} className="flex gap-3 text-sm text-text-secondary">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                        <span><strong className="font-semibold text-text-primary">{note[0]}.</strong> {note[1]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={isReversed ? "lg:order-1" : ""}>
                  <StepVisual stepIndex={index} qrDataUrl={qrDataUrl} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-bg-warm">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:py-24">
          <p className="font-display text-4xl leading-tight text-text-primary sm:text-5xl">Kamera HP bikin orang motret terus. TEMORA membuat setiap frame terasa berarti.</p>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-text-secondary">Atur event-mu hari ini, lalu biarkan tamu mengisi galeri dengan momen yang tidak bisa direncanakan.</p>
          <a href={getWhatsAppUrl()} className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue">Tanya tim TEMORA <ArrowRight className="h-4 w-4" aria-hidden /></a>
        </div>
      </section>
    </MarketingLayout>
  );
}
