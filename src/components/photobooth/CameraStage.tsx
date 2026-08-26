"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getPendingUploads,
  queuePendingUpload,
  retryPendingUpload,
  removePendingUpload,
  type PendingUpload,
  type SendResult,
} from "@/lib/upload-queue";

export type CameraStageProps = {
  eventId: string;
  eventName: string;
  tableId: string;
  tableLabel: string;
  frameUrl: string | null;
  watermarkText: string;
  /** Sisa kuota foto event; null = unlimited. 0 → capture dinonaktifkan. */
  remaining: number | null;
  onToast: (message: string) => void;
};

type Phase = "starting" | "live" | "preview" | "saved" | "denied" | "error";
type Facing = "user" | "environment";

type StripItem = {
  id: string; // = client_upload_id
  url: string;
  status: "done" | "pending";
};

type UploadMeta = { photoId: string; captureToken: string };

const MAX_LONG_SIDE = 1440;
const TARGET_BYTES = 800_000;
const THUMB_LONG_SIDE = 320;

// Rasio capture kanonik 3:4 portrait (design-system §3.3) — semua device
// menghasilkan foto 3:4 agar frame template selalu menutupi penuh.
const CAPTURE_RATIO = 3 / 4;

// Copy dari design-system §6.
const COPY = {
  cameraDenied:
    "Izin kamera belum aktif. Izinkan akses kamera lewat pengaturan browser-mu, lalu coba lagi ya.",
  cameraError:
    "Kamera belum bisa diakses. Tutup aplikasi lain yang memakai kamera, lalu coba lagi ya.",
  quotaFull:
    "Kuota momen acara ini sudah penuh. Terima kasih sudah jadi bagian dari momennya!",
  connection: "Koneksi lagi ngambek. Coba sekali lagi?",
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export function CameraStage({
  eventId,
  eventName,
  tableId,
  tableLabel,
  frameUrl,
  watermarkText,
  remaining,
  onToast,
}: CameraStageProps) {
  const cameraEnabled = remaining === null || remaining > 0;

  const [phase, setPhase] = useState<Phase>("starting");
  const [facing, setFacing] = useState<Facing>("user");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [strip, setStrip] = useState<StripItem[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const frameUsableRef = useRef(false);

  // Hasil capture aktif — dipakai ulang saat Simpan dan retry antrean.
  const captureRef = useRef<PendingUpload | null>(null);
  const savedBlobRef = useRef<Blob | null>(null);
  const activeMetaRef = useRef<UploadMeta | null>(null);
  const metaByIdRef = useRef(new Map<string, UploadMeta>());
  const dropMessageRef = useRef<string | null>(null);
  const failureKindRef = useRef<"network" | "http">("network");
  const objectUrlsRef = useRef<string[]>([]);

  const trackObjectUrl = (url: string) => objectUrlsRef.current.push(url);

  // ---- Kamera -----------------------------------------------------------

  const openCameraRef =
    useRef<(mode: Facing) => Promise<void>>(async () => undefined);

  const openCamera = useCallback(async (mode: Facing) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("error");
      return;
    }
    setPhase("starting");
    stopStream(streamRef.current);
    streamRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
      setFacing(mode);
      setPhase("live");
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPhase("denied");
        return;
      }
      // Kamera depan tidak tersedia → coba kamera belakang (task 004 §2).
      if (mode === "user") {
        return openCameraRef.current("environment");
      }
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    openCameraRef.current = openCamera;
  }, [openCamera]);

  useEffect(() => {
    if (!cameraEnabled) return;
    void openCameraRef.current("user");
    return () => stopStream(streamRef.current);
  }, [cameraEnabled]);

  // Frame PNG transparan untuk overlay + compositing (bucket frames publik).
  useEffect(() => {
    if (!frameUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      frameUsableRef.current = true;
    };
    img.onerror = () => {
      frameUsableRef.current = false;
    };
    img.src = frameUrl;
    frameImgRef.current = img;
  }, [frameUrl]);

  // ---- Upload -----------------------------------------------------------

  const sendUpload = useCallback(
    async (formData: FormData): Promise<SendResult> => {
      let res: Response;
      try {
        res = await fetch(`/api/events/${eventId}/photos/upload`, {
          method: "POST",
          body: formData,
        });
      } catch {
        failureKindRef.current = "network";
        return "retry"; // offline / jaringan putus → masuk antrean
      }

      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        photoId?: string;
        captureToken?: string | null;
        error?: string;
      } | null;

      if (res.ok && body?.ok && body.photoId && body.captureToken) {
        const id = formData.get("clientUploadId");
        if (typeof id === "string") {
          metaByIdRef.current.set(id, {
            photoId: body.photoId,
            captureToken: body.captureToken,
          });
        }
        return "ok";
      }

      if ([400, 403, 404, 415].includes(res.status)) {
        dropMessageRef.current =
          body?.error ?? "Momen gagal tersimpan. Coba sekali lagi ya.";
        return "drop";
      }

      // 429 / 5xx → coba lagi nanti, tapi jangan masuk antrean IndexedDB
      // dari jalur Simpan langsung; pesan server ditampilkan sebagai banner.
      dropMessageRef.current = body?.error ?? COPY.connection;
      failureKindRef.current = "http";
      return "retry";
    },
    [eventId],
  );

  const markStripDone = useCallback((id: string) => {
    setStrip((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "done" } : it)),
    );
  }, []);

  const dropStripItem = useCallback((id: string) => {
    setStrip((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const flushQueue = useCallback(async () => {
    const pending = await getPendingUploads();
    for (const item of pending) {
      const result = await retryPendingUpload(item, sendUpload);
      if (result === "ok") {
        markStripDone(item.clientUploadId);
        onToast("Momen tersimpan ✨");
      } else if (result === "drop") {
        await removePendingUpload(item.clientUploadId);
        dropStripItem(item.clientUploadId);
        setBanner(dropMessageRef.current ?? COPY.connection);
      } else {
        break; // masih offline — hentikan percobaan
      }
    }
  }, [sendUpload, markStripDone, dropStripItem, onToast]);

  useEffect(() => {
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [flushQueue]);

  // ---- Capture & compositing (task 004 §4.2) ----------------------------

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || phase !== "live" || busy) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    setBusy(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    // Crop video ke rasio kanonik 3:4 (design-system §3.3):
    // - video lebih lebar → potong kiri/kanan (center horizontal)
    // - video lebih tinggi → potong bawah, bias atas agar wajah subjek aman
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (vw / vh > CAPTURE_RATIO) {
      sw = Math.round(vh * CAPTURE_RATIO);
      sx = Math.round((vw - sw) / 2);
    } else if (vw / vh < CAPTURE_RATIO) {
      sh = Math.round(vw / CAPTURE_RATIO);
      sy = 0; // top-bias: crop berlebih di bawah
    }

    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(sw, sh));
    const cw = Math.round(sw * scale);
    const ch = Math.round(sh * scale);

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }

    ctx.save();
    if (facing === "user") {
      // Mirror konsisten dengan preview kamera depan.
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.restore();

    // Frame PNG transparan, object-contain center.
    const frame = frameImgRef.current;
    if (frameUsableRef.current && frame?.complete) {
      try {
        const fScale = Math.min(cw / frame.width, ch / frame.height);
        const dw = frame.width * fScale;
        const dh = frame.height * fScale;
        ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      } catch {
        // Canvas tainted (CORS frame gagal) → simpan tanpa frame, jangan blok tamu.
      }
    }

    // Watermark brand, pojok kanan bawah (design-system §8).
    const fontSize = Math.max(14, Math.round(ch * 0.028));
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = fontSize * 0.4;
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillText(watermarkText, cw - cw * 0.04, ch - ch * 0.045);
    ctx.shadowBlur = 0;

    void (async () => {
      // Kompres bertahap sampai < ~800KB.
      let quality = 0.85;
      let blob = await canvasToBlob(canvas, quality);
      while (blob && blob.size > TARGET_BYTES && quality > 0.5) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, quality);
      }
      if (!blob) {
        setBusy(false);
        return;
      }

      // Thumbnail 320px dibuat client-side (database.md §10.3).
      const tScale = Math.min(1, THUMB_LONG_SIDE / Math.max(cw, ch));
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = Math.round(cw * tScale);
      thumbCanvas.height = Math.round(ch * tScale);
      thumbCanvas
        .getContext("2d")
        ?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbBlob = await canvasToBlob(thumbCanvas, 0.72);

      const url = URL.createObjectURL(blob);
      trackObjectUrl(url);

      captureRef.current = {
        clientUploadId: crypto.randomUUID(),
        eventId,
        tableId,
        width: cw,
        height: ch,
        imageBlob: blob,
        thumbBlob,
      };
      savedBlobRef.current = null;
      activeMetaRef.current = null;

      setPreviewUrl(url);
      setPhase("preview");
      setBusy(false);
    })();
  }, [phase, busy, facing, watermarkText, eventId, tableId]);

  const retake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    captureRef.current = null;
    setPreviewUrl(null);
    setBanner(null);
    setPhase("live");
  }, [previewUrl]);

  const save = useCallback(async () => {
    const item = captureRef.current;
    if (!item || busy) return;

    setBusy(true);
    setBanner(null);

    // Optimistik: thumbnail langsung muncul di strip (design-system §10).
    const stripUrl = item.thumbBlob
      ? URL.createObjectURL(item.thumbBlob)
      : previewUrl ?? "";
    if (item.thumbBlob) trackObjectUrl(stripUrl);
    setStrip((prev) => [
      ...prev.slice(-5),
      { id: item.clientUploadId, url: stripUrl, status: "pending" },
    ]);

    const result = await retryPendingUpload(item, sendUpload);

    if (result === "ok") {
      const meta = metaByIdRef.current.get(item.clientUploadId);
      if (meta) {
        savedBlobRef.current = item.imageBlob;
        activeMetaRef.current = meta;
        markStripDone(item.clientUploadId);
        onToast("Momen tersimpan ✨");
        setPhase("saved"); // foto tetap tampil + tombol Simpan ke HP
      } else {
        dropStripItem(item.clientUploadId);
        setBanner(COPY.connection);
      }
    } else if (result === "drop") {
      // Gagal permanen (kuota penuh / tautan salah) — antrean sudah dibersihkan.
      dropStripItem(item.clientUploadId);
      setBanner(dropMessageRef.current ?? COPY.connection);
    } else {
      const isNetwork = failureKindRef.current === "network";
      if (isNetwork) {
        // Offline → simpan blob ke IndexedDB; terkirim otomatis saat online.
        await queuePendingUpload(item);
        setBanner(COPY.connection);
        // Kembali ke kamera; strip tetap menampilkan chip "Menyimpan…".
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        captureRef.current = null;
        setPreviewUrl(null);
        setPhase("live");
      } else {
        // 429/5xx: tetap di preview, tamu bisa tap Simpan lagi nanti.
        setBanner(dropMessageRef.current ?? COPY.connection);
      }
    }

    setBusy(false);
  }, [busy, previewUrl, sendUpload, markStripDone, dropStripItem, onToast]);

  // ---- Simpan ke HP / bagikan (Web Share + fallback unduh) --------------

  const trackSaved = useCallback(
    (meta: UploadMeta) => {
      void fetch(`/api/events/${eventId}/photos/${meta.photoId}/saved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureToken: meta.captureToken }),
      }).catch(() => undefined);
    },
    [eventId],
  );

  const saveToPhone = useCallback(async () => {
    const blob = savedBlobRef.current;
    const meta = activeMetaRef.current;
    if (!blob) return;

    const file = new File([blob], "temora-momen.jpg", { type: "image/jpeg" });

    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: eventName });
      } catch {
        return; // tamu menutup share sheet
      }
    } else {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
    }

    if (meta) trackSaved(meta);
    onToast("Momen sekarang ada di HP-mu ✨");
  }, [eventName, onToast, trackSaved]);

  // ---------- Kuota habis: tanpa kamera, tombol capture nonaktif ---------

  if (!cameraEnabled) {
    return (
      <main className="flex min-h-dvh flex-col bg-bg-base">
        <Header eventName={eventName} tableLabel={tableLabel} />
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
          <button
            type="button"
            disabled
            aria-label="Ambil Momen"
            className="h-20 w-20 cursor-not-allowed rounded-full opacity-50 shadow-card ring-4 ring-bg-card"
            style={{ backgroundColor: "var(--event-accent)" }}
          />
          <p className="max-w-xs text-center text-sm leading-relaxed text-text-secondary">
            {COPY.quotaFull}
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  // ---------- Layout utama (design-system §4) ----------------------------

  return (
    <main className="flex min-h-dvh flex-col bg-bg-base">
      <Header eventName={eventName} tableLabel={tableLabel} />

      <div className="flex flex-1 flex-col justify-between gap-5 px-4 pb-6 pt-4">
        {/* Stage */}
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl bg-text-primary shadow-card">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              phase === "live" || phase === "starting" ? "opacity-100" : "opacity-0"
            } ${facing === "user" ? "-scale-x-100" : ""}`}
          />

          {(phase === "preview" || phase === "saved") && previewUrl ? (
            // Signature moment §5: foto "develop" seperti film instan.
            // eslint-disable-next-line @next/next/no-img-element -- blob lokal
            <img
              src={previewUrl}
              alt="Momen yang baru diambil"
              className="animate-develop absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          {(phase === "live" || phase === "starting") && (
            <>
              {frameUrl ? (
                <>
                  {/* Overlay preview — sumber sama dengan yang digambar ke canvas */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL publik Supabase Storage */}
                  <img
                    src={frameUrl}
                    alt=""
                    aria-hidden
                    crossOrigin="anonymous"
                    onError={() => {
                      frameUsableRef.current = false;
                    }}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-[4%] bottom-[4%] max-w-[70%] truncate text-right text-xs font-semibold text-white/60"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}
                  >
                    {watermarkText}
                  </span>
                </>
              ) : null}
            </>
          )}

          {phase === "starting" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30">
              <span className="h-10 w-10 animate-pulse rounded-full border-2 border-white/70 border-t-transparent" />
              <p className="text-sm text-white/85">Menyiapkan kamera…</p>
            </div>
          ) : null}

          {phase === "denied" || phase === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                <CameraOff className="h-5 w-5 text-white/90" aria-hidden />
              </span>
              <p className="text-sm leading-relaxed text-white/90">
                {phase === "denied" ? COPY.cameraDenied : COPY.cameraError}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void openCameraRef.current("user")}
              >
                Coba Lagi
              </Button>
            </div>
          ) : null}

          {/* Flash §5 */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${
              flash ? "opacity-90" : "opacity-0"
            }`}
          />

          {phase === "live" ? (
            <button
              type="button"
              onClick={() =>
                void openCameraRef.current(facing === "user" ? "environment" : "user")
              }
              aria-label="Ganti kamera"
              className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
            >
              <SwitchCamera className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>

        {/* Kontrol */}
        <div className="flex flex-col items-center gap-3">
          {banner ? (
            <p
              role="status"
              className="max-w-sm rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-center text-xs leading-relaxed text-text-primary"
            >
              {banner}
            </p>
          ) : null}

          {phase === "live" || phase === "starting" ? (
            <>
              <button
                type="button"
                onClick={capture}
                disabled={phase !== "live" || busy}
                aria-label="Ambil Momen"
                className="h-20 w-20 rounded-full shadow-card ring-4 ring-bg-card transition-transform duration-150 ease-out active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
                style={{ backgroundColor: "var(--event-accent)" }}
              />
              <p className="text-xs text-text-secondary">Tap untuk ambil momen</p>
            </>
          ) : null}

          {phase === "preview" ? (
            <>
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" onClick={retake} disabled={busy}>
                  Ulangi
                </Button>
                <Button onClick={() => void save()} disabled={busy}>
                  {busy ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
              <p className="text-xs text-text-secondary">Momen siap disimpan</p>
            </>
          ) : null}

          {phase === "saved" ? (
            <>
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" onClick={retake}>
                  Ambil Lagi
                </Button>
                <Button onClick={() => void saveToPhone()}>Simpan ke HP</Button>
              </div>
              <p className="text-xs text-text-secondary">
                Momen tersimpan ke galeri acara ✨
              </p>
            </>
          ) : null}
        </div>

        {/* Strip momen sesi ini */}
        <div className="mx-auto flex min-h-16 w-full max-w-sm items-center gap-2 overflow-x-auto py-1">
          {strip.map((item) => (
            <figure key={item.id} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob lokal */}
              <img
                src={item.url}
                alt="Momen sesi ini"
                className={`h-16 w-16 rounded-md object-cover shadow-soft ${
                  item.status === "done"
                    ? "ring-2 ring-accent"
                    : "ring-1 ring-border"
                }`}
              />
              {item.status === "pending" ? (
                <figcaption className="absolute bottom-0.5 left-0.5 rounded bg-bg-card/90 px-1 text-[9px] text-text-secondary">
                  Menyimpan…
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}

function Header({ eventName, tableLabel }: { eventName: string; tableLabel: string }) {
  return (
    <header className="px-4 pt-6 pb-2 text-center">
      <h1 className="font-display text-3xl leading-tight text-text-primary">
        {eventName}
      </h1>
      <p className="mt-0.5 text-sm text-text-secondary">{tableLabel}</p>
    </header>
  );
}

function Footer() {
  return (
    <footer className="px-4 pb-7 text-center">
      <p className="font-display text-sm italic tracking-wide text-text-secondary">
        Keep it close. Keep it TEMORA.
      </p>
    </footer>
  );
}
