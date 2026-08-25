// Helper URL Storage (database.md §6):
// thumbs & frames publik → URL langsung; photos privat → signed URL server-side.

export function publicStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${path}`;
}
