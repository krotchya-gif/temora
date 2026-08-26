// Model kartu momen showcase + resolver URL gambar satu pintu (docs/qa-report.md §7).
// Prioritas: external_url (placeholder Unsplash/Wikimedia/picsum) →
// objek storage bucket publik 'showcase' (upload superadmin).

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

export function momentImageUrl(row: ShowcaseRow, publicBase: string): string {
  if (row.external_url) return row.external_url;
  return `${publicBase}/storage/v1/object/public/${row.storage_path ?? ""}`;
}

/** Fallback gambar stabil per id agar UI tak pernah kosong. */
export function picsumFallback(id: string): string {
  return `https://picsum.photos/seed/temora-moment-${id}/640/480`;
}
