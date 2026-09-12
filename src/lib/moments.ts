// Model kartu momen showcase + resolver URL gambar satu pintu (docs/qa-report.md §7).
// Prioritas: external_url (placeholder Unsplash/Wikimedia/picsum) →
// objek media publik 'showcase' (upload superadmin).
import { publicStorageUrl } from "@/lib/storage";

export type MomentCard = {
  id: string;
  title: string;
  caption: string | null;
  url: string;
};

type ShowcaseRow = {
  storage_path: string | null;
  external_url: string | null;
};

export function momentImageUrl(row: ShowcaseRow, _publicBase: string): string {
  void _publicBase;
  if (row.external_url) return row.external_url;
  return publicStorageUrl(row.storage_path ?? "");
}

/** Fallback gambar stabil bermerek TEMORA (lokal) agar UI tak pernah kosong. */
export function picsumFallback(): string {
  return "/images/moment-placeholder.svg";
}
