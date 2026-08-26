"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type MomentCard = {
  id: string;
  storagePath: string;
  title: string;
  caption: string | null;
};

type MomentsLightboxProps = {
  items: MomentCard[];
  publicBase: string;
};

// Grid + lightbox galeri publik /moments (todo.md — pola Chiffon /galeri).
export function MomentsGrid({ items, publicBase }: MomentsLightboxProps) {
  const [active, setActive] = useState<MomentCard | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const url = (path: string) => `${publicBase}/storage/v1/object/public/${path}`;

  return (
    <>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-bg-card text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none"
            aria-label={`Lihat momen ${item.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- objek publik statis */}
            <img
              src={url(item.storagePath)}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="w-full bg-bg-warm object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
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
            {/* eslint-disable-next-line @next/next/no-img-element -- objek publik statis */}
            <img
              src={url(active.storagePath)}
              alt={active.title}
              className="max-h-[60vh] w-full rounded-xl object-contain bg-bg-warm"
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
