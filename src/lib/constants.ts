export const SITE_NAME = "TEMORA";
export const SITE_TAGLINE = "Keep the moments close.";

// Aturan tier terkunci — database.md §2.7.
export const TIER_ACTIVE_EVENT_LIMITS: Record<
  "free" | "basic" | "pro",
  number | null
> = { free: 1, basic: 3, pro: null };

export const TIER_PHOTO_LIMITS: Record<
  "free" | "basic" | "pro",
  number | null
> = { free: 100, basic: 500, pro: null };

export const WA_ADMIN_NUMBER =
  process.env.NEXT_PUBLIC_WA_ADMIN_NUMBER ?? "6281234567890";

export const WA_ACTIVATION_TEXT =
  "Halo! Saya tertarik untuk mencoba TEMORA virtual photobooth.";

export function getWhatsAppUrl(text = WA_ACTIVATION_TEXT) {
  return `https://wa.me/${WA_ADMIN_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const PRICING_TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "Gratis",
    description: "Coba TEMORA di acara pertamamu.",
    features: [
      "1 event aktif",
      "Event nonaktif unlimited",
      "100 foto per event",
      "QR kartu meja",
      "Galeri & unduh ZIP",
    ],
    cta: "Mulai Gratis",
    href: "/signup",
    highlighted: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: 99000,
    priceLabel: "Rp 99K",
    period: "/bulan",
    description: "Untuk vendor yang mulai rutin handle acara.",
    features: [
      "3 event aktif",
      "500 foto per event",
      "Semua fitur Free",
      "Notifikasi WhatsApp",
    ],
    cta: "Pilih Basic",
    href: "/signup",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 299000,
    priceLabel: "Rp 299K",
    period: "/bulan",
    description: "Tanpa batas untuk wedding season penuh.",
    features: [
      "Event aktif unlimited",
      "Foto unlimited",
      "Watermark kustom",
      "Prioritas support",
    ],
    cta: "Pilih Pro",
    href: getWhatsAppUrl("Halo! Saya ingin upgrade ke paket Pro TEMORA."),
    highlighted: false,
  },
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Scan QR di meja",
    description:
      "Tamu buka kamera HP langsung dari kartu meja, tanpa install aplikasi.",
    icon: "qr" as const,
  },
  {
    step: "02",
    title: "Ambil momen",
    description:
      "Foto dengan frame kustom acara, preview instan, simpan ke HP atau bagikan.",
    icon: "camera" as const,
  },
  {
    step: "03",
    title: "Kelola & unduh",
    description:
      "Vendor lihat galeri real-time dan unduh semua foto sebagai ZIP resolusi tinggi.",
    icon: "gallery" as const,
  },
] as const;

export const DASHBOARD_NAV = [
  { label: "Overview", href: "/dashboard", icon: "layout" as const },
  { label: "Events", href: "/dashboard/events", icon: "calendar" as const },
  { label: "Billing", href: "/dashboard/billing", icon: "credit" as const },
  { label: "Pengaturan", href: "/dashboard/settings", icon: "settings" as const },
] as const;
