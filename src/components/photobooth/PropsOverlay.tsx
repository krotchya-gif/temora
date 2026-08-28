"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectFaceBoxes,
  getFaceLandmarker,
  type FaceBox,
} from "@/lib/ai/faceLandmark";
import { PROPS, propLayout, type PropId } from "@/lib/ai/props";
import { coverCrop, toCropSpace } from "@/lib/capture";

type PropsOverlayProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeProp: PropId | null;
  /** Wajah terdeteksi terakhir — dipakai capture (task 010 AC #2). */
  onFaces: (faces: FaceBox[] | null) => void;
  /** FPS turun di bawah ambang → UI menonaktifkan efek (auto-disable). */
  onAutoDisable: () => void;
  /** Kamera depan → preview di-mirror CSS; prop ikut di-flip agar menempel. */
  mirrored: boolean;
};

const MIN_FPS = 20;

export function PropsOverlay({
  videoRef,
  activeProp,
  onFaces,
  onAutoDisable,
  mirrored,
}: PropsOverlayProps) {
  const [faces, setFaces] = useState<FaceBox[] | null>(null);
  const [videoDims, setVideoDims] = useState({ vw: 0, vh: 0 });
  const rafRef = useRef<number | null>(null);
  const videoDimsRef = useRef({ vw: 0, vh: 0 });
  const frameTimesRef = useRef<number[]>([]);
  const failStreakRef = useRef(0);
  const lowFpsSinceRef = useRef<number | null>(null);
  const onFacesRef = useRef(onFaces);
  const onAutoDisableRef = useRef(onAutoDisable);

  useEffect(() => {
    onFacesRef.current = onFaces;
  }, [onFaces]);

  useEffect(() => {
    onAutoDisableRef.current = onAutoDisable;
  }, [onAutoDisable]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    frameTimesRef.current = [];
    lowFpsSinceRef.current = null;
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

        const loopStart = performance.now();
        const loop = (now: number) => {
          if (disposed) return;
          rafRef.current = requestAnimationFrame(loop);

          const boxes = detectFaceBoxes(landmarker, video, now);
          onFacesRef.current(boxes);
          setFaces(boxes);

          // Simpan dimensi video (state, bukan ref) untuk posisi crop-space.
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw && vh && (videoDimsRef.current.vw !== vw || videoDimsRef.current.vh !== vh)) {
            videoDimsRef.current = { vw, vh };
            setVideoDims({ vw, vh });
          }

          const times = frameTimesRef.current;
          times.push(now);
          const cutoff = now - 2000;
          while (times.length && times[0] < cutoff) times.shift();

          if (boxes) {
            failStreakRef.current = 0;
            // Estimasi fps valid hanya setelah window 2 detik penuh — sebelum
            // itu `times.length/2` ≈ 0 dan memicu disable palsu (bug: prop
            // mati dalam ~4 frame). Warm-up 2,5 detik, lalu disable setelah
            // ~4 detik konsisten di bawah ambang (berbasis waktu, bukan frame).
            if (now - loopStart >= 2500) {
              const fps = times.length / 2;
              if (fps < MIN_FPS) {
                if (lowFpsSinceRef.current === null) lowFpsSinceRef.current = now;
                if (now - lowFpsSinceRef.current > 4000) {
                  onAutoDisableRef.current();
                  stopLoop();
                }
              } else {
                lowFpsSinceRef.current = null;
              }
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
    // onAutoDisable dibaca via ref (stabil) — tidak perlu di deps agar loop
    // tidak restart setiap re-render induk.
  }, [activeProp, videoRef, stopLoop]);

  if (!activeProp) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {faces?.map((face, i) => {
        const prop = PROPS.find((p) => p.id === activeProp);
        if (!prop) return null;
        const { vw, vh } = videoDims;
        // Posisi dalam ruang crop (sama dengan foto hasil) + flip saat mirror,
        // supaya prop menempel di wajah pada preview kamera depan.
        const layout =
          vw && vh
            ? toCropSpace(propLayout(activeProp, face), coverCrop(vw, vh), vw, vh)
            : propLayout(activeProp, face);
        const x = mirrored ? 1 - layout.x - layout.w : layout.x;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- SVG inline data-URI
          <img
            key={i}
            src={prop.dataUri}
            alt=""
            className="absolute"
            style={{
              left: `${x * 100}%`,
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