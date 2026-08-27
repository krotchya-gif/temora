"use client";

import { useEffect, useRef } from "react";
import {
  compositeGreenScreen,
  getImageSegmenter,
  type BgId,
} from "@/lib/ai/segmentation";

type GreenScreenCanvasProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeBg: BgId;
  /** Kanvas hasil compositing — dipakai capture supaya preview == hasil. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Kamera depan → tampilan mirror (konsisten video & capture). */
  mirror: boolean;
  onFail: () => void;
};

export function GreenScreenCanvas({
  videoRef,
  activeBg,
  canvasRef,
  mirror,
  onFail,
}: GreenScreenCanvasProps) {
  const rafRef = useRef<number | null>(null);
  const failRef = useRef(onFail);

  useEffect(() => {
    failRef.current = onFail;
  }, [onFail]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let disposed = false;

    getImageSegmenter()
      .then((segmenter) => {
        if (disposed) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const loop = (now: number) => {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(loop);

          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw && vh && canvas.width !== vw) {
            canvas.width = vw;
            canvas.height = vh;
          }
          if (vw && vh) {
            compositeGreenScreen(ctx, segmenter, video, activeBg, now);
          }
        };
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => {
        // Model/CDN gagal → fitur nonaktif tanpa crash (fallback graceful).
        failRef.current();
      });

    return () => {
      disposed = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [activeBg, videoRef, canvasRef]);

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