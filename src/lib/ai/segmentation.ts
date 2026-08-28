// Green screen (task 011) — lazy-load MediaPipe ImageSegmenter.
// Referensi teknis: docs/architecture.md §8.1. Model dimuat hanya saat
// tab "Latar" dibuka (fallback graceful bila gagal).

import type { ImageSegmenter } from "@mediapipe/tasks-vision";

export type BgId = "warm" | "dots" | "cream";

// Token kanonik design-system §2.1 — bukan hex baru.
const T = {
  bgBase: "#F9F6F1",
  accent: "#8B7355",
  accentSecondary: "#D4A574",
  dustyBlue: "#8FA8B8",
  mauve: "#A48B94",
};

export const BACKGROUNDS: { id: BgId; label: string }[] = [
  { id: "warm", label: "Hangat" },
  { id: "dots", label: "Titik" },
  { id: "cream", label: "Krem" },
];

let segmenterPromise: Promise<ImageSegmenter> | null = null;

export function getImageSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: true,
      });
    })();
  }
  return segmenterPromise;
}

/** Gambar latar bawaan ke canvas (token design-system, tanpa aset eksternal). */
export function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: BgId,
): void {
  ctx.clearRect(0, 0, w, h);
  switch (bg) {
    case "warm": {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, T.bgBase);
      grad.addColorStop(0.5, T.accentSecondary);
      grad.addColorStop(1, T.accent);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "dots": {
      ctx.fillStyle = T.bgBase;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = T.dustyBlue;
      const gap = 56;
      const r = 7;
      for (let y = r; y < h; y += gap) {
        for (let x = r; x < w; x += gap) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "cream": {
      ctx.fillStyle = T.mauve;
      ctx.fillRect(0, 0, w, h);
      const grad2 = ctx.createRadialGradient(w * 0.8, h * 0.1, 0, w * 0.8, h * 0.1, w);
      grad2.addColorStop(0, T.accentSecondary);
      grad2.addColorStop(1, T.mauve);
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }
}

/** Potong subjek (mask person) dari video, gambarkan di atas latar. */
export function compositeGreenScreen(
  ctx: CanvasRenderingContext2D,
  segmenter: ImageSegmenter,
  video: HTMLVideoElement,
  bg: BgId,
  ts: number,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const result = segmenter.segmentForVideo(video, ts);

  // Confidence mask per label; confidenceMasks[0] = background (model card
  // selfie_segmenter: label 0 = background, 1 = person). Revisi 2026-08-28
  // (§6n): categoryMask pada build ini berperilaku seperti channel background
  // — jadi person dihitung sebagai "BUKAN background" (1 - bgConf), bukan
  // threshold langsung pada categoryMask.
  let maskData: Float32Array | null = null;
  let mw = 0;
  let mh = 0;
  const bgMask = result.confidenceMasks?.[0];
  if (bgMask) {
    maskData = bgMask.getAsFloat32Array();
    mw = bgMask.width;
    mh = bgMask.height;
  } else {
    const cat = result.categoryMask;
    if (!cat) return;
    maskData = cat.getAsFloat32Array();
    mw = cat.width;
    mh = cat.height;
  }
  if (!maskData) return;

  // 1) Latar bawaan di canvas utama.
  paintBackground(ctx, vw, vh, bg);

  // 2) Mask RGBA: person = alpha penuh, latar = transparan. Soft edge:
  //    ramp 0.3–0.7 pada "person-ness" (1 - bgConf) → tepi lebih halus.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = mw;
  maskCanvas.height = mh;
  const mctx = maskCanvas.getContext("2d");
  if (!mctx) return;
  const rgba = new Uint8ClampedArray(mw * mh * 4);
  for (let i = 0; i < mw * mh; i++) {
    const v = 1 - maskData[i]; // person-ness (bgConf rendah → person)
    const alpha =
      v <= 0.3 ? 0 : v >= 0.7 ? 255 : Math.round(((v - 0.3) / 0.4) * 255);
    rgba[i * 4 + 3] = alpha;
  }
  mctx.putImageData(new ImageData(rgba, mw, mh), 0, 0);

  // 3) Video dipotong jadi hanya subjek (destination-in).
  const cutCanvas = document.createElement("canvas");
  cutCanvas.width = vw;
  cutCanvas.height = vh;
  const cctx = cutCanvas.getContext("2d");
  if (!cctx) return;
  cctx.drawImage(maskCanvas, 0, 0, vw, vh);
  cctx.globalCompositeOperation = "source-in";
  cctx.drawImage(video, 0, 0, vw, vh);
  cctx.globalCompositeOperation = "source-over";

  // 4) Subjek di atas latar.
  ctx.drawImage(cutCanvas, 0, 0);
}