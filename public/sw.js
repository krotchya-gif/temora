// Service Worker TEMORA (PWA, architecture.md §13).
// Statis di public/ — tanpa integrasi build (Hostinger shared + webpack).
// Update cache = bump CACHE_VERSION lalu deploy.
//
// Strategi:
//  - Precache shell + icon saat install.
//  - Navigasi: network-first, fallback cache (offline → shell terakhir).
//  - Aset statis & LUT: cache-first.
//  - POST, /api/*, request Supabase: network-only (auth/RLS wajib online).
const CACHE_VERSION = "temora-v2";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/web-app-manifest-192x192.png",
  "/icons/web-app-manifest-512x512.png",
  "/icons/maskable-512.png",
  "/logos/temora-wordmark.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigasi halaman: network-first, fallback ke cache shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // API route: network-only (auth/upload sensitif — jangan di-cache).
  if (url.pathname.startsWith("/api/")) return;

  // Aset statis (JS/CSS/font build, icon, logo) + LUT filter: cache-first.
  if (/^\/(_next\/static|icons|logos|luts)\//.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }
});