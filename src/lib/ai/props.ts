// Props AR (task 010) — aset SVG inline + penempatan wajah.
// Warna memakai token kanonik design-system §2.1 (bukan hex baru).
// 10 jenis (2026-08-28): hat, glasses, flower, crown, bunny, mustache,
// party, sunglasses, halo, bow — semuanya aset SVG custom, tanpa file eksternal.

import type { FaceBox } from "@/lib/ai/faceLandmark";

export type PropId =
  | "hat"
  | "glasses"
  | "flower"
  | "crown"
  | "bunny"
  | "mustache"
  | "party"
  | "sunglasses"
  | "halo"
  | "bow";

// Token kanonik (design-system §2.1) — referensi, bukan hex baru.
const T = {
  accent: "#8B7355",
  accentSecondary: "#D4A574",
  dustyBlue: "#8FA8B8",
  mauve: "#A48B94",
  ink: "#3D3A36",
  bgBase: "#F9F6F1",
};

const SVG: Record<PropId, string> = {
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
  crown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
    <path d="M10 66 L16 22 L44 40 L60 12 L76 40 L104 22 L110 66 Z" fill="${T.accentSecondary}"/>
    <rect x="10" y="66" width="100" height="12" rx="4" fill="${T.accent}"/>
    <circle cx="60" cy="12" r="7" fill="${T.dustyBlue}"/>
    <circle cx="30" cy="34" r="5" fill="${T.dustyBlue}"/>
    <circle cx="90" cy="34" r="5" fill="${T.dustyBlue}"/>
  </svg>`,
  bunny: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110">
    <ellipse cx="34" cy="34" rx="18" ry="44" fill="${T.bgBase}" stroke="${T.mauve}" stroke-width="5"/>
    <ellipse cx="86" cy="34" rx="18" ry="44" fill="${T.bgBase}" stroke="${T.mauve}" stroke-width="5"/>
    <ellipse cx="34" cy="40" rx="9" ry="28" fill="${T.mauve}"/>
    <ellipse cx="86" cy="40" rx="9" ry="28" fill="${T.mauve}"/>
  </svg>`,
  mustache: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60">
    <path d="M8 12 C40 42 62 48 80 30 C98 48 120 42 152 12 C130 24 112 14 80 14 C48 14 30 24 8 12 Z" fill="${T.ink}" opacity="0.92"/>
  </svg>`,
  party: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 110">
    <path d="M40 4 L76 104 Q40 118 4 104 Z" fill="${T.mauve}"/>
    <path d="M40 4 L76 104 L40 108 Z" fill="${T.dustyBlue}" opacity="0.65"/>
    <circle cx="30" cy="52" r="7" fill="${T.bgBase}" opacity="0.85"/>
    <circle cx="52" cy="76" r="6" fill="${T.bgBase}" opacity="0.85"/>
    <circle cx="44" cy="28" r="5" fill="${T.accentSecondary}"/>
  </svg>`,
  sunglasses: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 70">
    <rect x="2" y="8" width="80" height="54" rx="20" fill="${T.ink}"/>
    <rect x="118" y="8" width="80" height="54" rx="20" fill="${T.ink}"/>
    <path d="M84 34 H116" stroke="${T.ink}" stroke-width="9" stroke-linecap="round"/>
    <rect x="2" y="26" width="80" height="18" rx="9" fill="${T.accentSecondary}" opacity="0.35"/>
    <rect x="118" y="26" width="80" height="18" rx="9" fill="${T.accentSecondary}" opacity="0.35"/>
  </svg>`,
  halo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60">
    <ellipse cx="80" cy="32" rx="72" ry="26" fill="none" stroke="${T.accentSecondary}" stroke-width="12" opacity="0.9"/>
  </svg>`,
  bow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <path d="M40 40 L8 12 Q2 40 40 40" fill="${T.mauve}"/>
    <path d="M40 40 L72 12 Q78 40 40 40" fill="${T.dustyBlue}"/>
    <path d="M40 40 L8 68 Q2 40 40 40" fill="${T.dustyBlue}" opacity="0.85"/>
    <path d="M40 40 L72 68 Q78 40 40 40" fill="${T.mauve}" opacity="0.85"/>
    <circle cx="40" cy="40" r="9" fill="${T.accentSecondary}"/>
  </svg>`,
};

export type PropDef = { id: PropId; label: string; dataUri: string };

export const PROPS: PropDef[] = (
  [
    "hat",
    "glasses",
    "flower",
    "crown",
    "bunny",
    "mustache",
    "party",
    "sunglasses",
    "halo",
    "bow",
  ] as const
).map((id) => ({
  id,
  label:
    id === "hat"
      ? "Topi"
      : id === "glasses"
        ? "Kacamata"
        : id === "flower"
          ? "Bunga"
          : id === "crown"
            ? "Mahkota"
            : id === "bunny"
              ? "Kelinci"
              : id === "mustache"
                ? "Kumis"
                : id === "party"
                  ? "Pesta"
                  : id === "sunglasses"
                    ? "Hitam"
                    : id === "halo"
                      ? "Halo"
                      : "Pita",
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
    case "crown": {
      const w = face.w * 0.9;
      const h = w * 0.6;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.62 - h, w, h };
    }
    case "bunny": {
      const w = face.w * 1.1;
      const h = w * 0.92;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.72 - h * 0.4, w, h };
    }
    case "mustache": {
      const w = face.w * 0.62;
      const h = w * 0.36;
      return { x: face.cx - w / 2, y: face.mouthY - h / 2, w, h };
    }
    case "party": {
      const w = face.w * 0.68;
      const h = w * 1.15;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.72 - h, w, h };
    }
    case "sunglasses": {
      const w = face.w * 1.25;
      const h = w * 0.32;
      return { x: face.cx - w / 2, y: face.eyeY - h / 2, w, h };
    }
    case "halo": {
      const w = face.w * 1.25;
      const h = w * 0.38;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.92 - h / 2, w, h };
    }
    case "bow": {
      const w = face.w * 0.6;
      const h = w * 0.85;
      return {
        x: face.cx - face.w * 0.95 - w / 2,
        y: face.cy + face.h * 0.08,
        w,
        h,
      };
    }
  }
}