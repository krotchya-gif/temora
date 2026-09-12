"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { picsumFallback, type MomentCard } from "@/lib/moments";

type MomentsGridProps = {
  items: MomentCard[];
};

// Grid + lightbox galeri publik /moments (pola Chiffon /galeri).
export function MomentsGrid({ items }: MomentsGridProps) {
  const [active, setActive] = useState<MomentCard | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className={`group mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-bg-card text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none ${index % 4 === 1 ? "rotate-[0.8deg]" : index % 4 === 2 ? "-rotate-[0.6deg]" : index % 4 === 3 ? "rotate-[0.35deg]" : ""}`}
            aria-label={`Lihat momen ${item.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- gambar eksternal/publik statis */}
            <img
              src={item.url}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fb) {
                  img.dataset.fb = "1";
                  img.src = picsumFallback();
                }
              }}
              className="w-full bg-bg-warm object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
            />
            <span className="block px-4 py-3">
              <span className="font-display text-lg leading-tight text-text-primary">
                {item.title}
              </span>
              {item.caption && (
                <span className="mt-1 line-clamp-2 block text-xs italic leading-relaxed text-text-secondary">
                  “{item.caption}”
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
        >
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setActive(null)}
            className="absolute inset-0 cursor-default bg-text-primary/70 backdrop-blur-md"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Momen ${active.title}`}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-bg-card p-4 shadow-card sm:p-6"
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Tutup detail momen"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border bg-bg-base/80 text-text-primary transition-colors hover:border-accent"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- gambar eksternal/publik statis */}
            <img
              src={active.url}
              alt={active.title}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fb) {
                  img.dataset.fb = "1";
                  img.src = picsumFallback();
                }
              }}
              className="animate-develop max-h-[60vh] w-full rounded-xl bg-bg-warm object-contain"
            />
            <div className="mt-4 space-y-1 px-1 pb-1">
              <p className="font-display text-2xl text-text-primary">{active.title}</p>
              {active.caption && (
                <p className="text-sm italic leading-relaxed text-text-secondary">
                  “{active.caption}” —{" "}
                  <span className="not-italic">Keep it close. Keep it TEMORA.</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
