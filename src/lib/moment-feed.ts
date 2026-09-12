import type { SupabaseClient } from "@supabase/supabase-js";
import { publicStorageUrl } from "@/lib/storage";

export type MomentFeedItem = {
  id: string;
  kind: "photo" | "moment";
  occurredAt: string;
  photoId: string | null;
  momentId: string | null;
  thumbUrl: string | null;
  tableLabel: string | null;
  caption: string | null;
  isHidden: boolean;
};

export type MomentFeedPage = {
  items: MomentFeedItem[];
  nextCursor: string | null;
  total: number;
};

type Cursor = { occurredAt: string; id: string };

export function encodeMomentCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeMomentCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>;
    if (
      typeof parsed.occurredAt !== "string" ||
      Number.isNaN(Date.parse(parsed.occurredAt)) ||
      typeof parsed.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(parsed.id)
    ) return null;
    return { occurredAt: parsed.occurredAt, id: parsed.id };
  } catch {
    return null;
  }
}

function olderThan(column: "created_at" | "taken_at", cursor: Cursor) {
  return `${column}.lt.${cursor.occurredAt},and(${column}.eq.${cursor.occurredAt},id.lt.${cursor.id})`;
}

export function mergeMomentFeedItems(
  moments: MomentFeedItem[],
  photos: MomentFeedItem[],
  limit: number,
) {
  const merged = [...moments, ...photos].sort((a, b) => {
    const byTime = b.occurredAt.localeCompare(a.occurredAt);
    return byTime || b.id.localeCompare(a.id);
  });
  return {
    items: merged.slice(0, limit),
    hasMore: merged.length > limit,
  };
}

/**
 * Menggabungkan moments (dengan/tanpa foto) dan foto yang belum punya moment.
 * Kedua stream memakai cursor global waktu+UUID, lalu digabung stabil di server.
 */
export async function loadMomentFeed(
  supabase: SupabaseClient,
  eventId: string,
  options: { cursor?: Cursor | null; limit?: number } = {},
): Promise<MomentFeedPage> {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const cursor = options.cursor ?? null;

  let momentsQuery = supabase
    .from("moments")
    .select(
      "id, photo_id, content, is_hidden, created_at, tables(label), photo:photos(id, thumb_path, deleted_at)",
      { count: "exact" },
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  let photosQuery = supabase
    .from("photos")
    .select(
      "id, thumb_path, taken_at, tables(label), moments!left(id)",
      { count: "exact" },
    )
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .is("moments", null)
    .order("taken_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    momentsQuery = momentsQuery.or(olderThan("created_at", cursor));
    photosQuery = photosQuery.or(olderThan("taken_at", cursor));
  }

  const [momentsResult, photosResult] = await Promise.all([momentsQuery, photosQuery]);
  if (momentsResult.error) throw new Error(momentsResult.error.message);
  if (photosResult.error) throw new Error(photosResult.error.message);

  const momentItems: MomentFeedItem[] = (momentsResult.data ?? []).map((raw) => {
    const row = raw as unknown as {
      id: string;
      photo_id: string | null;
      content: string;
      is_hidden: boolean;
      created_at: string;
      tables: { label: string } | null;
      photo: { id: string; thumb_path: string | null; deleted_at: string | null } | null;
    };
    const activePhoto = row.photo && !row.photo.deleted_at ? row.photo : null;
    return {
      id: row.id,
      kind: "moment",
      occurredAt: row.created_at,
      photoId: activePhoto?.id ?? null,
      momentId: row.id,
      thumbUrl: activePhoto?.thumb_path ? publicStorageUrl(activePhoto.thumb_path) : null,
      tableLabel: row.tables?.label ?? null,
      caption: row.content,
      isHidden: row.is_hidden,
    };
  });

  const photoItems: MomentFeedItem[] = (photosResult.data ?? []).map((raw) => {
    const row = raw as unknown as {
      id: string;
      thumb_path: string | null;
      taken_at: string;
      tables: { label: string } | null;
    };
    return {
      id: row.id,
      kind: "photo",
      occurredAt: row.taken_at,
      photoId: row.id,
      momentId: null,
      thumbUrl: row.thumb_path ? publicStorageUrl(row.thumb_path) : null,
      tableLabel: row.tables?.label ?? null,
      caption: null,
      isHidden: false,
    };
  });

  const { items, hasMore } = mergeMomentFeedItems(momentItems, photoItems, limit);
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeMomentCursor({ occurredAt: last.occurredAt, id: last.id })
        : null,
    total: (momentsResult.count ?? 0) + (photosResult.count ?? 0),
  };
}
