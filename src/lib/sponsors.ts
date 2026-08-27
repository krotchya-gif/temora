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

/** URL publik logo — kolom DB berformat {bucket}/{key} (database.md §6). */
export function sponsorLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  const [bucket, ...rest] = logoPath.split("/");
  if (!bucket || !rest.length) return null;
  const { NEXT_PUBLIC_SUPABASE_URL } = process.env;
  if (!NEXT_PUBLIC_SUPABASE_URL) return null;
  return `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${rest.join("/")}`;
}

/** Public URL tanpa env (client-side) — perlu base URL dari props. */
export function sponsorLogoUrlFromBase(
  baseUrl: string,
  logoPath: string | null,
): string | null {
  if (!logoPath) return null;
  const [bucket, ...rest] = logoPath.split("/");
  if (!bucket || !rest.length) return null;
  return `${baseUrl}/storage/v1/object/public/${bucket}/${rest.join("/")}`;
}