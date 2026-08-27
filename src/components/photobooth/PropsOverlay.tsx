"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectFaceBoxes,
  getFaceLandmarker,
  type FaceBox,
} from "@/lib/ai/faceLandmark";
import { PROPS, propLayout, type PropId } from "@/lib/ai/props";

type PropsOverlayProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeProp: PropId | null;
  /** Wajah terdeteksi terakhir — dipakai capture (task 010 AC #2). */
  onFaces: (faces: FaceBox[] | null) => void;
  /** FPS turun di bawah ambang → UI menonaktifkan efek (auto-disable). */
  onAutoDisable: () => void;
};

const MIN_FPS = 20;

export function PropsOverlay({
  videoRef,
  activeProp,
  onFaces,
  onAutoDisable,
}: PropsOverlayProps) {
  const [faces, setFaces] = useState<FaceBox[] | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const failStreakRef = useRef(0);
  const lowFpsStreakRef = useRef(0);
  const onFacesRef = useRef(onFaces);

  useEffect(() => {
    onFacesRef.current = onFaces;
  }, [onFaces]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    frameTimesRef.current = [];
    onFacesRef.current(null);
  }, []);

  useEffect(() => {
    if (!activeProp) {
      stopLoop();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let disposed = false;

    getFaceLandmarker()
      .then((landmarker) => {
        if (disposed) return;

        const loop = (now: number) => {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(loop);

          const boxes = detectFaceBoxes(landmarker, video, now);
          onFacesRef.current(boxes);
          setFaces(boxes);

          const times = frameTimesRef.current;
          times.push(now);
          const cutoff = now - 2000;
          while (times.length && times[0] < cutoff) times.shift();

          if (boxes) {
            failStreakRef.current = 0;
            const fps = times.length / 2;
            lowFpsStreakRef.current = fps < MIN_FPS ? lowFpsStreakRef.current + 1 : 0;
            // ~4 detik konsisten di bawah ambang → disable otomatis.
            if (lowFpsStreakRef.current >= 4) {
              onAutoDisable();
              stopLoop();
            }
          } else {
            failStreakRef.current += 1;
            // Wajah hilang lama (kamera terhalang/dijauhkan) → tenang, jangan loop mati.
            if (failStreakRef.current > 600) stopLoop();
          }
        };
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => {
        // Model gagal dimuat (jaringan/CDN) → fitur nonaktif tanpa crash.
        stopLoop();
      });

    return () => {
      disposed = true;
      stopLoop();
    };
  }, [activeProp, videoRef, stopLoop, onAutoDisable]);

  if (!activeProp) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {faces?.map((face, i) => {
        const prop = PROPS.find((p) => p.id === activeProp);
        if (!prop) return null;
        const layout = propLayout(activeProp, face);
        return (
          // eslint-disable-next-line @next/next/no-img-element -- SVG inline data-URI
          <img
            key={i}
            src={prop.dataUri}
            alt=""
            className="absolute"
            style={{
              left: `${layout.x * 100}%`,
              top: `${layout.y * 100}%`,
              width: `${layout.w * 100}%`,
              height: `${layout.h * 100}%`,
            }}
          />
        );
      })}
    </div>
  );
}