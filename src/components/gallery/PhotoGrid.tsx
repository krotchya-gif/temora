"use client";

import { Images, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type PhotoGridItem = {
  id: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  tableLabel?: string | null;
  takenAt?: string | null;
};

type PhotoGridProps = {
  photos: PhotoGridItem[];
  /** Klik kartu → buka lightbox. */
  onSelect?: (index: number) => void;
  /** Tampil bila diisi — hapus foto individual dengan konfirmasi di parent. */
  onDelete?: (photo: PhotoGridItem) => void;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: React.ReactNode;
};

export function formatPhotoTime(takenAt: string | null | undefined) {
  if (!takenAt) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(takenAt));
}

export function PhotoGrid({
  photos,
  onSelect,
  onDelete,
  emptyTitle = "Belum ada momen yang terabadikan.",
  emptyBody = "Bagikan QR code-nya dulu, ya.",
  emptyAction,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <Card className="px-6 py-14 text-center sm:px-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-warm">
          <Images className="h-5 w-5 text-accent" aria-hidden />
        </div>
        <p className="mt-5 font-display text-2xl text-text-primary">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          {emptyBody}
        </p>
        {emptyAction ? <div className="mt-6">{emptyAction}</div> : null}
      </Card>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo, index) => (
        <li key={photo.id}>
          <figure
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? "Buka pratinjau momen" : undefined}
            onClick={onSelect ? () => onSelect(index) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(index);
                    }
                  }
                : undefined
            }
            className={`group relative rounded-lg bg-bg-card p-1.5 pb-6 shadow-soft transition-all duration-200 ${
              onSelect
                ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
                : ""
            } hover:-translate-y-0.5 hover:rotate-1 hover:shadow-card motion-reduce:transition-none motion-reduce:hover:rotate-0 motion-reduce:hover:translate-y-0`}
          >
            {/* Thumb publik bucket 'thumbs' — full-size hanya via lightbox. */}
            {photo.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL publik Supabase Storage
              <img
                src={photo.thumbUrl}
                alt={
                  photo.tableLabel
                    ? `Momen tamu dari ${photo.tableLabel}`
                    : "Momen tamu acara"
                }
                loading="lazy"
                className="aspect-[4/5] w-full rounded-sm object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-sm bg-bg-warm">
                <Images className="h-5 w-5 text-text-secondary" aria-hidden />
              </div>
            )}

            {onDelete ? (
              <button
                type="button"
                aria-label="Hapus momen ini"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo);
                }}
                className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-bg-card/90 text-text-secondary opacity-0 shadow-soft transition-opacity hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}

            <figcaption className="absolute inset-x-0 bottom-1.5 truncate text-center font-mono text-[11px] text-text-secondary">
              {[photo.tableLabel, formatPhotoTime(photo.takenAt)]
                .filter(Boolean)
                .join(" · ")}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
