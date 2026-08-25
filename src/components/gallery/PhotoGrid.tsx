import Image from "next/image";
import { Images } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type PhotoGridItem = {
  id: string;
  url: string;
  width: number;
  height: number;
  table?: string;
  time?: string;
};

type PhotoGridProps = {
  photos: PhotoGridItem[];
  /** CTA opsional di empty state, mis. tombol menuju halaman QR. */
  emptyAction?: React.ReactNode;
};

export function PhotoGrid({ photos, emptyAction }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <Card className="px-6 py-14 text-center sm:px-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-warm">
          <Images className="h-5 w-5 text-accent" aria-hidden />
        </div>
        <p className="mt-5 font-display text-2xl text-text-primary">
          Belum ada momen yang terabadikan.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Bagikan QR code-nya dulu, ya.
        </p>
        {emptyAction ? <div className="mt-6">{emptyAction}</div> : null}
      </Card>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <li key={photo.id}>
          <figure className="group relative rounded-lg bg-bg-card p-1.5 pb-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:rotate-1 hover:shadow-card motion-reduce:transition-none motion-reduce:hover:rotate-0 motion-reduce:hover:translate-y-0">
            <Image
              src={photo.url}
              alt={
                photo.table
                  ? `Momen tamu dari ${photo.table}`
                  : "Momen tamu acara"
              }
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="aspect-[4/5] w-full rounded-sm object-cover"
            />
            {photo.table || photo.time ? (
              <figcaption className="absolute inset-x-0 bottom-1.5 truncate text-center font-mono text-[11px] text-text-secondary">
                {[photo.table, photo.time].filter(Boolean).join(" · ")}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
