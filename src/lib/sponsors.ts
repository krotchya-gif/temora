// Sponsors (task 013) — logo partner di frame & kartu QR (tier Pro).

export type SponsorRow = {
  id: string;
  event_id: string;
  name: string;
  logo_path: string | null;
  position: "frame" | "qr";
  is_active: boolean;
  created_at: string;
};

import { publicStorageUrl } from "@/lib/storage";

/** URL publik logo dari media.temora.site. */
export function sponsorLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return publicStorageUrl(logoPath);
}

/** Public URL tanpa env (client-side) — perlu base URL dari props. */
export function sponsorLogoUrlFromBase(
  baseUrl: string,
  logoPath: string | null,
): string | null {
  if (!logoPath) return null;
  if (/^https?:\/\//i.test(logoPath)) return logoPath;
  return `${baseUrl.replace(/\/$/, "")}/public/${logoPath}`;
}
