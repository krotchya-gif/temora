"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { publicStorageUrl } from "@/lib/storage";
import {
  Lightbox,
  type LightboxPhoto,
} from "@/components/gallery/Lightbox";
import {
  PhotoGrid,
  type PhotoGridItem,
} from "@/components/gallery/PhotoGrid";

type GalleryClientProps = {
  eventId: string;
  initialPhotos: PhotoGridItem[];
  total: number;
};

const PAGE_SIZE = 20;
const SYNC_THRESHOLD = 100;

/** Buka unduhan via anchor sementara — murni DOM, tanpa state React. */
function triggerBrowserDownload(href: string, filename?: string, revoke = true) {
  const anchor = document.createElement("a");
  anchor.href = href;
  if (filename) anchor.download = filename;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  anchor.click();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

type ZipState =
  | { phase: "idle" }
  | { phase: "sync"; message: string }
  | { phase: "job"; jobId: string; processed: number; total: number }
  | { phase: "done"; url: string };

export function GalleryClient({
  eventId,
  initialPhotos,
  total,
}: GalleryClientProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [photoTotal, setPhotoTotal] = useState(total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [zip, setZip] = useState<ZipState>({ phase: "idle" });
  const [message, setMessage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(initialPhotos.length);

  // ---- Load more (infinite scroll) --------------------------------------

  const loadMore = useCallback(async () => {
    if (loadingMore || offsetRef.current >= photoTotal) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/photos?offset=${offsetRef.current}&limit=${PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        photos: PhotoGridItem[];
        total: number;
      };
      offsetRef.current += data.photos.length;
      setPhotoTotal(data.total);
      setPhotos((prev) => [...prev, ...data.photos]);
    } catch {
      setMessage("Gagal memuat momen berikutnya. Coba gulir lagi.");
    } finally {
      setLoadingMore(false);
    }
  }, [eventId, loadingMore, photoTotal]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // ---- Realtime: foto baru muncul tanpa reload (database.md §5) ---------

  type PhotoInsertRow = {
    id: string;
    thumb_path: string | null;
    width: number | null;
    height: number | null;
    taken_at: string;
  };

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`photos:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: RealtimePostgresChangesPayload<PhotoInsertRow>) => {
          const row = payload.new as unknown as PhotoInsertRow;
          setPhotos((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [
              {
                id: row.id,
                thumbUrl: row.thumb_path
                  ? publicStorageUrl(row.thumb_path)
                  : null,
                width: row.width,
                height: row.height,
                tableLabel: null,
                takenAt: row.taken_at,
              },
              ...prev,
            ];
          });
          setPhotoTotal((t) => t + 1);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  // ---- Lightbox loader (signed URL on-demand) ---------------------------

  const loadFullUrl = useCallback(
    async (photoId: string) => {
      const res = await fetch(`/api/events/${eventId}/photos/${photoId}`);
      if (!res.ok) throw new Error("signed url gagal");
      const data = (await res.json()) as { signedUrl: string };
      return data.signedUrl;
    },
    [eventId],
  );

  const lightboxPhotos: LightboxPhoto[] = photos.map((p) => ({
    id: p.id,
    alt: p.tableLabel
      ? `Momen tamu dari ${p.tableLabel}`
      : "Momen tamu acara",
    loadFullUrl,
  }));

  // ---- Hapus foto --------------------------------------------------------

  async function handleDelete(photo: PhotoGridItem) {
    if (!window.confirm("Hapus momen ini dari galeri?")) return;
    const res = await fetch(`/api/events/${eventId}/photos/${photo.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setPhotoTotal((t) => Math.max(0, t - 1));
      offsetRef.current = Math.max(0, offsetRef.current - 1);
    } else {
      setMessage("Gagal menghapus momen. Coba sekali lagi ya.");
    }
  }

  // ---- Unduh ZIP ---------------------------------------------------------

  async function handleZip() {
    setMessage(null);
    setZip({ phase: "sync", message: "Menyiapkan ZIP…" });

    try {
      const res = await fetch(`/api/events/${eventId}/photos/zip`, {
        method: "POST",
      });

      // Jalur sinkron (≤100 foto): respons langsung berupa file ZIP.
      const contentType = res.headers.get("content-type") ?? "";
      if (res.ok && contentType === "application/zip") {
        const blob = await res.blob();
        triggerBrowserDownload(URL.createObjectURL(blob));
        router.refresh();
        setZip({ phase: "idle" });
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | ({ ok?: boolean; jobId?: string; status?: string; processed?: number; total?: number; downloadUrl?: string; error?: string })
        | null;

      if (!res.ok || !data || data.error) {
        setZip({ phase: "idle" });
        setMessage(data?.error ?? "ZIP gagal dibuat. Coba sekali lagi ya.");
        return;
      }

      if (!data.jobId) {
        setZip({ phase: "idle" });
        return;
      }

      setZip({
        phase: "job",
        jobId: data.jobId,
        processed: data.processed ?? 0,
        total: data.total ?? photoTotal,
      });
    } catch {
      setZip({ phase: "idle" });
      setMessage("Koneksi lagi ngambek. Coba sekali lagi?");
    }
  }

  // Polling job >100 foto — tiap panggilan memajukan satu chunk di server.
  useEffect(() => {
    if (zip.phase !== "job") return;
    let alive = true;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/events/${eventId}/photos/zip?job=${zip.jobId}`,
        );
        const data = (await res.json()) as {
          status?: string;
          processed?: number;
          total?: number;
          downloadUrl?: string;
          error?: string;
        };
        if (!alive) return;

        if (data.status === "done" && data.downloadUrl) {
          setZip({ phase: "done", url: data.downloadUrl });
        } else if (data.status === "error") {
          setZip({ phase: "idle" });
          setMessage(data.error ?? "ZIP gagal dibuat. Coba sekali lagi ya.");
        } else if (data.status === "running") {
          setZip((prev) =>
            prev.phase === "job"
              ? {
                  ...prev,
                  processed: data.processed ?? prev.processed,
                  total: data.total ?? prev.total,
                }
              : prev,
          );
        }
      } catch {
        // jaringan tersendat — coba lagi pada tick berikutnya
      }
    };

    void poll();
    const timer = setInterval(poll, 3_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [zip, eventId]);

  useEffect(() => {
    if (zip.phase !== "done") return;
    // Signed URL 15 menit dibuka di tab baru; jangan revoke milik server.
    triggerBrowserDownload(zip.url, undefined, false);
    router.refresh();
  }, [zip, router]);


  const busy =
    zip.phase === "sync" ||
    (zip.phase === "job" &&
      zip.total > 0 &&
      zip.processed < zip.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          <span className="font-mono font-medium text-text-primary">
            {photoTotal}
          </span>{" "}
          momen terkumpul
        </p>
        <Button onClick={() => void handleZip()} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden />
          )}
          Simpan Semua Momen
        </Button>
      </div>

      {zip.phase === "job" ? (
        <div
          role="status"
          className="rounded-lg border border-border bg-bg-card px-4 py-3 text-xs text-text-secondary"
        >
          Menyiapkan ZIP… {zip.processed}/{zip.total} foto
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-warm">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{
                width: `${zip.total ? Math.round((zip.processed / zip.total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-text-primary"
        >
          {message}
        </p>
      ) : null}

      <PhotoGrid
        photos={photos}
        onSelect={setLightboxIndex}
        onDelete={(photo) => void handleDelete(photo)}
      />

      {/* Sentinel infinite scroll */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {loadingMore ? (
        <p className="py-4 text-center text-xs text-text-secondary">Memuat…</p>
      ) : null}

      <Lightbox
        photos={lightboxPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />

      <p className="text-center text-[11px] text-text-secondary">
        {photoTotal > SYNC_THRESHOLD
          ? "Unduhan event besar disiapkan bertahap di server — aman ditutup, link aktif 15 menit."
          : ""}
      </p>
    </div>
  );
}
