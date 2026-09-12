"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  MessageCircleHeart,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MomentFeedItem, MomentFeedPage } from "@/lib/moment-feed";
import { Lightbox, type LightboxPhoto } from "@/components/gallery/Lightbox";

type MomentWorkspaceProps = {
  eventId: string;
  eventName: string;
  initialPage: MomentFeedPage;
  initialError?: string | null;
};

type ZipFormat = "polaroid" | "original";
type ZipState =
  | { phase: "idle" }
  | { phase: "sync"; format: ZipFormat }
  | { phase: "job"; format: ZipFormat; jobId: string; processed: number; total: number };

const PAGE_SIZE = 20;

function triggerDownload(href: string, filename?: string, revoke = false) {
  const anchor = document.createElement("a");
  anchor.href = href;
  if (filename) anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

function formatMomentTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MomentWorkspace({ eventId, eventName, initialPage, initialError = null }: MomentWorkspaceProps) {
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [total, setTotal] = useState(initialPage.total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(initialError);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [zip, setZip] = useState<ZipState>({ phase: "idle" });
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (cursor?: string | null) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/events/${eventId}/feed?${params}`);
    const data = (await response.json().catch(() => null)) as
      | (MomentFeedPage & { error?: string })
      | null;
    if (!response.ok || !data) {
      throw new Error(data?.error ?? "Momen belum bisa dimuat.");
    }
    return data;
  }, [eventId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const page = await fetchPage();
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      setItems((current) => {
        const known = new Set(current.map((item) => `${item.kind}:${item.id}`));
        return [...current, ...page.items.filter((item) => !known.has(`${item.kind}:${item.id}`))];
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore, nextCursor]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && void loadMore(),
      { rootMargin: "600px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refresh(), 250);
    };
    const channel = supabase
      .channel(`moment-workspace:${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "photos", filter: `event_id=eq.${eventId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "moments", filter: `event_id=eq.${eventId}` }, scheduleRefresh)
      .subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [eventId, refresh]);

  async function toggleHidden(item: MomentFeedItem) {
    if (!item.momentId) return;
    setBusyId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/events/${eventId}/moments/${item.momentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !item.isHidden }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Momen belum bisa diperbarui.");
      await refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function deletePhoto(item: MomentFeedItem) {
    if (!item.photoId || !window.confirm("Hapus foto ini dari Momen?")) return;
    setBusyId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/events/${eventId}/photos/${item.photoId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Foto belum bisa dihapus. Coba sekali lagi ya.");
      await refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function startZip(format: ZipFormat) {
    setMessage(null);
    setZip({ phase: "sync", format });
    try {
      const response = await fetch(`/api/events/${eventId}/photos/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.startsWith("application/zip")) {
        const blobUrl = URL.createObjectURL(await response.blob());
        triggerDownload(blobUrl, `temora-${format}.zip`, true);
        setZip({ phase: "idle" });
        return;
      }
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        jobId?: string;
        processed?: number;
        total?: number;
      } | null;
      if (!response.ok || !data?.jobId) throw new Error(data?.error ?? "ZIP gagal dibuat.");
      setZip({
        phase: "job",
        format,
        jobId: data.jobId,
        processed: data.processed ?? 0,
        total: data.total ?? total,
      });
    } catch (error) {
      setMessage((error as Error).message);
      setZip({ phase: "idle" });
    }
  }

  const jobId = zip.phase === "job" ? zip.jobId : null;
  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/photos/zip?job=${jobId}`);
        const data = (await response.json()) as {
          status?: "running" | "done" | "error";
          processed?: number;
          total?: number;
          downloadUrl?: string;
          error?: string;
        };
        if (!alive) return;
        if (data.status === "done" && data.downloadUrl) {
          triggerDownload(data.downloadUrl);
          setZip({ phase: "idle" });
        } else if (data.status === "error") {
          setMessage(data.error ?? "ZIP gagal dibuat.");
          setZip({ phase: "idle" });
        } else {
          setZip((current) => current.phase === "job" ? {
            ...current,
            processed: data.processed ?? current.processed,
            total: data.total ?? current.total,
          } : current);
        }
      } catch {
        // Gangguan singkat dipulihkan pada polling berikutnya.
      }
    };
    void poll();
    const timer = setInterval(poll, 3_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [eventId, jobId]);

  const lightboxPhotos = useMemo<LightboxPhoto[]>(() => items
    .filter((item) => item.photoId)
    .map((item) => ({
      id: `${item.kind}:${item.id}`,
      alt: item.tableLabel ? `Momen tamu dari ${item.tableLabel}` : "Momen tamu acara",
      title: eventName,
      caption: item.caption,
      polaroidUrl: item.isHidden
        ? undefined
        : item.kind === "moment"
          ? `/api/events/${eventId}/moments/${item.momentId}/polaroid`
          : `/api/events/${eventId}/photos/${item.photoId}/polaroid`,
      loadFullUrl: async () => {
        const response = await fetch(`/api/events/${eventId}/photos/${item.photoId}`);
        if (!response.ok) throw new Error("Foto belum bisa dibuka.");
        return ((await response.json()) as { signedUrl: string }).signedUrl;
      },
    })), [eventId, eventName, items]);
  const lightboxIndex = activeItemId
    ? lightboxPhotos.findIndex((photo) => photo.id === activeItemId)
    : -1;
  const zipBusy = zip.phase !== "idle";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          <span className="font-mono font-medium text-text-primary">{total}</span>{" "}
          momen terkumpul
          {refreshing ? <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" aria-label="Memperbarui" /> : null}
        </p>
        <details className="group relative self-start sm:self-auto">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue [&::-webkit-details-marker]:hidden">
            {zipBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Download className="mr-2 h-4 w-4" aria-hidden />}
            Simpan Semua Momen
            <MoreVertical className="ml-2 h-4 w-4" aria-hidden />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-bg-card p-2 shadow-card">
            <button type="button" disabled={zipBusy} onClick={() => void startZip("polaroid")} className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-medium text-text-primary hover:bg-bg-warm disabled:opacity-50">
              Polaroid <span className="block text-xs font-normal text-text-secondary">Foto + cerita, siap disimpan</span>
            </button>
            <button type="button" disabled={zipBusy} onClick={() => void startZip("original")} className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-medium text-text-primary hover:bg-bg-warm disabled:opacity-50">
              Foto asli <span className="block text-xs font-normal text-text-secondary">Resolusi asli tanpa kartu</span>
            </button>
          </div>
        </details>
      </div>

      {zip.phase === "job" ? (
        <div role="status" className="rounded-lg border border-border bg-bg-card px-4 py-3 text-xs text-text-secondary">
          Menyiapkan {zip.format === "polaroid" ? "Polaroid" : "foto asli"}… {zip.processed}/{zip.total}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-warm">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${zip.total ? Math.round((zip.processed / zip.total) * 100) : 0}%` }} />
          </div>
        </div>
      ) : null}

      {message ? <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary">{message}</p> : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card px-6 py-14 text-center">
          <MessageCircleHeart className="mx-auto h-7 w-7 text-accent" aria-hidden />
          <p className="mt-4 font-display text-2xl text-text-primary">Belum ada momen yang terabadikan.</p>
          <p className="mt-2 text-sm text-text-secondary">Bagikan QR code-nya dulu, ya.</p>
          <Link href={`/dashboard/events/${eventId}/qr`} className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-accent/30 px-4 text-sm font-medium text-accent hover:bg-accent/10">Kelola QR</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((item) => {
            const itemKey = `${item.kind}:${item.id}`;
            const polaroidUrl = item.kind === "moment"
              ? `/api/events/${eventId}/moments/${item.momentId}/polaroid`
              : `/api/events/${eventId}/photos/${item.photoId}/polaroid`;
            return (
              <li key={itemKey}>
                <article className="group relative flex h-full flex-col rounded-lg bg-bg-card p-2 pb-3 shadow-soft transition-shadow hover:shadow-card">
                  {item.isHidden ? <span className="absolute right-3 top-3 z-10 rounded-full bg-warning/90 px-2 py-1 text-[10px] font-medium text-text-primary">Disembunyikan</span> : null}
                  {item.thumbUrl ? (
                    <button type="button" onClick={() => setActiveItemId(itemKey)} aria-label="Buka foto momen" className="block w-full cursor-zoom-in rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue">
                      {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail media publik */}
                      <img src={item.thumbUrl} alt={item.tableLabel ? `Momen tamu dari ${item.tableLabel}` : "Momen tamu"} loading="lazy" decoding="async" className={`animate-develop aspect-[4/5] w-full rounded-sm object-cover ${item.isHidden ? "blur-[3px]" : ""}`} />
                    </button>
                  ) : (
                    <div className={`flex aspect-[4/5] items-center justify-center rounded-sm bg-bg-warm p-4 ${item.isHidden ? "blur-[2px]" : ""}`}>
                      {item.caption ? <blockquote className="line-clamp-6 text-center font-display text-lg italic leading-relaxed text-text-primary">“{item.caption}”</blockquote> : <ImageIcon className="h-6 w-6 text-text-secondary/50" aria-hidden />}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col px-1 pt-3">
                    <p className="truncate font-display text-base font-semibold text-text-primary">{eventName}</p>
                    {item.caption && item.thumbUrl ? <blockquote className="mt-1 line-clamp-3 text-xs italic leading-relaxed text-text-secondary">“{item.caption}”</blockquote> : null}
                    <p className="mt-auto pt-2 font-mono text-[10px] text-text-secondary">{[item.tableLabel, formatMomentTime(item.occurredAt)].filter(Boolean).join(" · ")}</p>
                    <div className="mt-2 flex items-center justify-end gap-1 border-t border-border pt-2">
                      {!item.isHidden ? <a href={polaroidUrl} aria-label="Unduh Polaroid" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-warm hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"><Download className="h-4 w-4" aria-hidden /></a> : null}
                      {item.momentId ? <button type="button" disabled={busyId === item.id} onClick={() => void toggleHidden(item)} aria-label={item.isHidden ? "Tampilkan momen" : "Sembunyikan momen"} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-warm hover:text-accent disabled:opacity-50">{item.isHidden ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}</button> : null}
                      {item.photoId ? <button type="button" disabled={busyId === item.id} onClick={() => void deletePhoto(item)} aria-label="Hapus foto" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-danger/10 hover:text-danger disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden /></button> : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} aria-hidden className="h-px" />
      {loadingMore ? <p className="py-4 text-center text-xs text-text-secondary">Memuat momen berikutnya…</p> : null}

      <Lightbox
        photos={lightboxPhotos}
        index={lightboxIndex >= 0 ? lightboxIndex : null}
        onClose={() => setActiveItemId(null)}
        onNavigate={(index) => setActiveItemId(lightboxPhotos[index]?.id ?? null)}
      />
    </div>
  );
}
