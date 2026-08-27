// AR face tracking (task 010) — lazy-load MediaPipe FaceLandmarker.
// Model & WASM dimuat hanya saat tab "Efek" dibuka (architecture.md §8.3).
// Referensi teknis: docs/architecture.md §8.2.

import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export type FaceBox = {
  /** Posisi/skala ternormalisasi (0–1 relatif video frame). */
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Garis mata (rata-rata landmark 33 & 263) — patokan kacamata. */
  eyeY: number;
};

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 4, // group photo kecil (task 010 AC #3)
        minFaceDetectionConfidence: 0.5,
      });
    })();
  }
  return landmarkerPromise;
}

/** Deteksi wajah; null bila tak ada. Posisi ternormalisasi 0–1. */
export function detectFaceBoxes(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  ts: number,
): FaceBox[] | null {
  const result = landmarker.detectForVideo(video, ts);
  if (!result.faceLandmarks?.length) return null;

  return result.faceLandmarks.map((landmarks) => {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    let eyeSum = 0;
    let eyeCount = 0;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y > maxY) maxY = lm.y;
    }
    // Landmark mata kiri 33 & kanan 263.
    for (const idx of [33, 263]) {
      const lm = landmarks[idx];
      if (lm) {
        eyeSum += lm.y;
        eyeCount += 1;
      }
    }
    const w = Math.max(maxX - minX, 0.08);
    const h = Math.max(maxY - minY, 0.08);
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w,
      h,
      eyeY: eyeCount ? eyeSum / eyeCount : (minY + maxY) / 2,
    };
  });
}