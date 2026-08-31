import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { MonitoringProvider } from "@/components/MonitoringProvider";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { SeoScripts } from "@/components/SeoScripts";
import { appUrl, getPublicSettings } from "@/lib/seo-settings";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Metadata dinamis dari platform_settings (tab SEO — /admin/seo).
// Fallback = nilai statis BRAND.md §10 bila key kosong / build tanpa env.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const base = appUrl();

  const defaultTitle = "TEMORA — Virtual Photobooth for Every Moment";
  const defaultDescription =
    "Capture the moments that matter with TEMORA, a virtual photobooth experience for weddings, birthdays, gatherings, and special events.";

  const title = settings.seo_title?.trim() || defaultTitle;
  const description = settings.seo_description?.trim() || defaultDescription;
  const ogImage = settings.seo_og_image?.trim() || "/og.png";
  const keywords = settings.seo_keywords?.trim()
    ? settings.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : undefined;

  const other: Record<string, string> = {};
  const gsc = settings.gsc_verification?.trim();
  if (gsc) other["google-site-verification"] = gsc;

  return {
    metadataBase: base,
    title: { default: title, template: "%s · TEMORA" },
    description,
    keywords,
    other,
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: "TEMORA",
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "TEMORA" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    icons: {
      icon: "/logos/temora-wordmark.svg",
      apple: "/icons/apple-touch-icon-180.png",
    },
  };
}

// PWA (architecture.md §13): theme-color = token bg-base (#F9F6F1).
export const viewport: Viewport = {
  themeColor: "#F9F6F1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${cormorant.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-dvh">
        {children}
        <PwaInstallPrompt />
        <MonitoringProvider />
        <SeoScripts />
      </body>
    </html>
  );
}
