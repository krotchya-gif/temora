// Props AR (task 010) — aset stiker + penempatan wajah.
// 10 jenis (2026-08-28): 6 dari Twemoji (CC BY 4.0 — public/props/, kredit
// docs/research/lut-credits.md) + 4 SVG custom (hat, bunny, mustache, halo —
// tak ada padanan emoji yang cocok). Warna custom memakai token design-system.

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

const SVG: Partial<Record<PropId, string>> = {
  hat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96">
    <path d="M14 44 C14 14 106 14 106 44 L98 90 L22 90 Z" fill="${T.accentSecondary}"/>
    <path d="M14 44 C14 20 106 20 106 44 L106 52 C106 30 14 30 14 52 Z" fill="${T.accent}"/>
    <ellipse cx="60" cy="90" rx="40" ry="6" fill="${T.ink}" opacity="0.85"/>
    <circle cx="60" cy="6" r="9" fill="${T.dustyBlue}"/>
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
  halo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60">
    <ellipse cx="80" cy="32" rx="72" ry="26" fill="none" stroke="${T.accentSecondary}" stroke-width="12" opacity="0.9"/>
  </svg>`,
};

// Twemoji (CC BY 4.0) — file statis di public/props/.
const TWEMOJI: Partial<Record<PropId, string>> = {
  glasses: "/props/glasses.svg",
  flower: "/props/flower.svg",
  crown: "/props/crown.svg",
  party: "/props/party.svg",
  sunglasses: "/props/sunglasses.svg",
  bow: "/props/bow.svg",
};

export type PropDef = { id: PropId; label: string; src: string };

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
  src: TWEMOJI[id] ?? `data:image/svg+xml;utf8,${encodeURIComponent(SVG[id] ?? "")}`,
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
      const w = face.w * 1.35;
      const h = w * 0.5;
      return { x: face.cx - w / 2, y: face.eyeY - h * 0.55, w, h };
    }
    case "flower": {
      const w = face.w * 0.8;
      const h = w * 1.05;
      return {
        x: face.cx - face.w * 0.85 - w / 2,
        y: face.cy - face.h * 0.4 - h / 2,
        w,
        h,
      };
    }
    case "crown": {
      const w = face.w * 0.95;
      const h = w * 0.62;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.6 - h * 0.45, w, h };
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
      const w = face.w * 0.62;
      const h = w * 1.0;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.72 - h, w, h };
    }
    case "sunglasses": {
      const w = face.w * 1.4;
      const h = w * 0.55;
      return { x: face.cx - w / 2, y: face.eyeY - h * 0.55, w, h };
    }
    case "halo": {
      const w = face.w * 1.25;
      const h = w * 0.38;
      return { x: face.cx - w / 2, y: face.cy - face.h * 0.92 - h / 2, w, h };
    }
    case "bow": {
      const w = face.w * 0.6;
      const h = w * 0.8;
      return {
        x: face.cx - face.w * 0.95 - w / 2,
        y: face.cy + face.h * 0.1,
        w,
        h,
      };
    }
  }
}