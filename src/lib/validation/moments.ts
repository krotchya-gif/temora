import { z } from "zod";

// Moments (task 012) — caption/guestbook digital. Batas 280 karakter
// (database.md §2.8). Validasi server-side; client hanya helper.

export const momentCreateSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Tulis dulu momenmu, ya.")
    .max(280, "Maksimal 280 karakter."),
  tableId: z.string().uuid("Tautan meja tidak valid."),
  photoId: z.string().uuid().optional(),
});

export type MomentCreateInput = z.infer<typeof momentCreateSchema>;

export type MomentRow = {
  id: string;
  event_id: string;
  table_id: string | null;
  photo_id: string | null;
  content: string;
  is_hidden: boolean;
  created_at: string;
};

/** Sanitasi dasar teks bebas (database.md §9.1). */
export function sanitizeMomentContent(raw: string): string {
  return raw.replace(/[<>`]/g, "").trim().slice(0, 280);
}