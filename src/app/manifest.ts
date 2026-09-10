import type { MetadataRoute } from "next";

// Web App Manifest (PWA, architecture.md §13). Warna dari token design-system
// §2.1 (bg-base #F9F6F1) — bukan hex baru.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TEMORA — Virtual Photobooth for Every Moment",
    short_name: "TEMORA",
    description:
      "Virtual photobooth untuk acara istimewa — simpan momen lewat layar utama.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F9F6F1",
    theme_color: "#F9F6F1",
    icons: [
      { src: "/icons/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}