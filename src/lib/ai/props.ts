// Props AR (task 010) — aset SVG inline + penempatan wajah.
// Warna memakai token kanonik design-system §2.1 (bukan hex baru).

import type { FaceBox } from "@/lib/ai/faceLandmark";

export type PropId = "hat" | "glasses" | "flower";

// Token kanonik (design-system §2.1) — referensi, bukan hex baru.
const T = {
  accent: "#8B7355",
  accentSecondary: "#D4A574",
  dustyBlue: "#8FA8B8",
  mauve: "#A48B94",
  ink: "#3D3A36",
};

const SVG = {
  hat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96">
    <path d="M14 44 C14 14 106 14 106 44 L98 90 L22 90 Z" fill="${T.accentSecondary}"/>
    <path d="M14 44 C14 20 106 20 106 44 L106 52 C106 30 14 30 14 52 Z" fill="${T.accent}"/>
    <ellipse cx="60" cy="90" rx="40" ry="6" fill="${T.ink}" opacity="0.85"/>
    <circle cx="60" cy="6" r="9" fill="${T.dustyBlue}"/>
  </svg>`,
  glasses: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 70">
    <rect x="2" y="8" width="80" height="54" rx="24" fill="none" stroke="${T.ink}" stroke-width="9" opacity="0.9"/>
    <rect x="118" y="8" width="80" height="54" rx="24" fill="none" stroke="${T.ink}" stroke-width="9" opacity="0.9"/>
    <path d="M84 34 H116" stroke="${T.ink}" stroke-width="9" stroke-linecap="round"/>
    <rect x="2" y="8" width="80" height="22" rx="11" fill="${T.dustyBlue}" opacity="0.5"/>
    <rect x="118" y="8" width="80" height="22" rx="11" fill="${T.dustyBlue}" opacity="0.5"/>
  </svg>`,
  flower: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="26" fill="${T.mauve}"/>
    <circle cx="40" cy="14" r="14" fill="${T.dustyBlue}"/>
    <circle cx="66" cy="40" r="14" fill="${T.dustyBlue}"/>
    <circle cx="40" cy="66" r="14" fill="${T.dustyBlue}"/>
    <circle cx="14" cy="40" r="14" fill="${T.dustyBlue}"/>
    <circle cx="40" cy="40" r="11" fill="${T.accentSecondary}"/>
  </svg>`,
};

export type PropDef = { id: PropId; label: string; dataUri: string };

export const PROPS: PropDef[] = (
  ["hat", "glasses", "flower"] as const
).map((id) => ({
  id,
  label: id === "hat" ? "Topi" : id === "glasses" ? "Kacamata" : "Bunga",
  dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(SVG[id])}`,
}));

/** Posisi/skala prop (ternormalisasi 0–1) relatif kotak wajah. */
export function propLayout(
  prop: PropId,
  face: FaceBox,
): { x: number; y: number; w: number; h: number } {
  switch (prop) {
    case "hat": {
      const w = face.w * 1.35;
      const h = w * 0.8;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.62 - h, w, h };
    }
    case "glasses": {
      const w = face.w * 1.2;
      const h = w * 0.35;
      return { x: face.cx - w / 2, y: face.eyeY - h / 2, w, h };
    }
    case "flower": {
      const w = face.w * 0.75;
      return {
        x: face.cx - face.w * 0.85 - w / 2,
        y: face.cy - face.h * 0.35 - w / 2,
        w,
        h: w,
      };
    }
  }
}