"use client";

import { useEffect, useRef } from "react";
import { getLutRenderer, loadLut, type LutId } from "@/lib/ai/lut";

type GradeCanvasProps = {
  /** Sumber video mentah (video element atau kanvas green screen). */
  sourceRef: React.RefObject<HTMLVideoElement | HTMLCanvasElement | null>;
  activeLut: LutId;
  /** Kanvas hasil grade — dipakai capture supaya preview == hasil. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Kamera depan → tampilan mirror (konsisten video & capture). */
  mirror: boolean;
  onFail: () => void;
};

// Color grade via 3D LUT (WebGL) — lazy-load .cube saat tab "Filter" dibuka.
// Kontrak preview == hasil: kanvas ini jadi sumber capture ketika aktif.
export function GradeCanvas({
  sourceRef,
  activeLut,
  canvasRef,
  mirror,
  onFail,
}: GradeCanvasProps) {
  const rafRef = useRef<number | null>(null);
  const failRef = useRef(onFail);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    failRef.current = onFail;
  }, [onFail]);

  useEffect(() => {
    const renderer = getLutRenderer();
    if (!renderer) {
      failRef.current();
      return;
    }

    let disposed = false;

    loadLut(activeLut)
      .then((lut) => {
        if (disposed) return;
        renderer.setLut(lut);

        const loop = () => {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(loop);

          const source = sourceRef.current;
          const out = canvasRef.current;
          if (!source || !out) return;
          const video = source as HTMLVideoElement;
          const canvas = source as HTMLCanvasElement;
          const sw =
            typeof video.videoWidth === "number" && video.videoWidth
              ? video.videoWidth
              : canvas.width;
          const sh =
            typeof video.videoHeight === "number" && video.videoHeight
              ? video.videoHeight
              : canvas.height;
          if (!sw || !sh) return;

          // Sumber → buffer 2D (video texture WebGL rawan di iOS Safari).
          let buffer = bufferRef.current;
          if (!buffer) {
            buffer = document.createElement("canvas");
            bufferRef.current = buffer;
          }
          if (buffer.width !== sw || buffer.height !== sh) {
            buffer.width = sw;
            buffer.height = sh;
          }
          const bctx = buffer.getContext("2d");
          if (!bctx) return;
          bctx.drawImage(source, 0, 0, sw, sh);

          renderer.render(buffer, sw, sh, out);
        };
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => {
        // .cube gagal dimuat (jaringan/CDN) → fitur nonaktif tanpa crash.
        failRef.current();
      });

    return () => {
      disposed = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [activeLut, sourceRef, canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 h-full w-full object-cover ${
        mirror ? "-scale-x-100" : ""
      }`}
    />
  );
}