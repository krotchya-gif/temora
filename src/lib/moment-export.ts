import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadStorageFile } from "@/lib/storage";
import { renderPolaroid } from "@/lib/polaroid";

export type MomentExportItem = {
  id: string;
  photoId: string | null;
  storagePath: string | null;
  caption: string | null;
  occurredAt: string;
};

export type ExportPhotoRow = {
  id: string;
  storage_path: string;
  taken_at: string;
};

export type ExportMomentRow = {
  id: string;
  photo_id: string | null;
  content: string;
  created_at: string;
  is_hidden: boolean;
};

/**
 * Susun kartu secara deterministik. Moment tersembunyi tidak menjadi kartu,
 * namun fotonya tetap kembali sebagai kartu tanpa caption bila masih aktif.
 */
export function composePolaroidExportItems(
  photos: ExportPhotoRow[],
  moments: ExportMomentRow[],
): MomentExportItem[] {
  const photoMap = new Map(photos.map((photo) => [photo.id, photo]));
  const captioned = new Set<string>();
  const items: MomentExportItem[] = [];

  for (const moment of moments) {
    if (moment.is_hidden) continue;
    const photo = moment.photo_id ? photoMap.get(moment.photo_id) : null;
    if (photo) captioned.add(photo.id);
    items.push({
      id: moment.id,
      photoId: photo?.id ?? null,
      storagePath: photo?.storage_path ?? null,
      caption: moment.content,
      occurredAt: moment.created_at,
    });
  }

  for (const photo of photos) {
    if (captioned.has(photo.id)) continue;
    items.push({
      id: photo.id,
      photoId: photo.id,
      storagePath: photo.storage_path,
      caption: null,
      occurredAt: photo.taken_at,
    });
  }

  return items.sort((a, b) => {
    const byTime = b.occurredAt.localeCompare(a.occurredAt);
    return byTime || b.id.localeCompare(a.id);
  });
}

export async function listPolaroidExportItems(
  admin: SupabaseClient,
  eventId: string,
): Promise<MomentExportItem[]> {
  const [photosResult, momentsResult] = await Promise.all([
    admin
      .from("photos")
      .select("id, storage_path, taken_at")
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .order("taken_at", { ascending: false }),
    admin
      .from("moments")
      .select("id, photo_id, content, created_at, is_hidden")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  ]);
  if (photosResult.error) throw new Error(photosResult.error.message);
  if (momentsResult.error) throw new Error(momentsResult.error.message);

  return composePolaroidExportItems(
    (photosResult.data ?? []) as ExportPhotoRow[],
    (momentsResult.data ?? []) as ExportMomentRow[],
  );
}

export async function renderMomentExportItem(
  item: MomentExportItem,
  eventName: string,
) {
  const image = item.storagePath
    ? (await downloadStorageFile(item.storagePath)).bytes
    : null;
  return renderPolaroid({ image, eventName, caption: item.caption });
}
