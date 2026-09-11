// Utilitas event bersama: resolusi [eventId] (UUID atau slug) + aksen tema
// (design-system §2.2 — tema hanya menggeser accent, core palette tetap).

import type { CameraPreset, WatermarkPosition } from "@/lib/validation/event";

export type PhotoboothEvent = {
  id: string;
  name: string;
  slug: string;
  theme: string | null;
  startsAt: string | null;
  endsAt: string | null;
  frameUrl: string | null;
  coverTemplate: "bloom" | "rose" | "mono" | "night" | "paper";
  coverImageUrl: string | null;
  coverTitle: string | null;
  coverSubtitle: string | null;
  coverButtonText: string;
  watermarkText: string | null;
  watermarkPosition: WatermarkPosition;
  cameraPreset: CameraPreset;
  filterId: string | null;
  filterStrength: number;
};

export type PhotoboothTable = {
  id: string;
  label: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Aksen tema sebagai nilai CSS custom property (token design-system §2.1). */
const THEME_ACCENTS: Record<string, string> = {
  wedding: "var(--color-muted-mauve)",
  birthday: "var(--color-dusty-blue)",
  corporate: "var(--color-accent)",
  community: "var(--color-accent-secondary)",
  other: "var(--color-accent)",
};

export function themeAccent(theme: string | null): string {
  return THEME_ACCENTS[theme ?? "other"] ?? "var(--color-accent)";
}
