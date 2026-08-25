import { z } from "zod";

export const uploadSchema = z.object({
  tableId: z.string().uuid(),
  clientUploadId: z.string().uuid(),
  width: z.coerce.number().int().positive().max(10_000).optional(),
  height: z.coerce.number().int().positive().max(10_000).optional(),
});

export const savedSchema = z.object({
  captureToken: z.string().min(16).max(128),
});

/** Generate meja sekaligus; regenerateTableId = ganti satu meja dgn QR baru. */
export const tablesGenerateSchema = z.object({
  count: z.coerce.number().int().min(1).max(50).optional(),
  regenerateTableId: z.string().uuid().optional(),
});

export const idSchema = z.object({ eventId: z.string().uuid() });
export const tableIdSchema = z.object({ tableId: z.string().uuid() });

/** Batas ukuran file upload (bytes) — kompresi klien target <800KB, kasih ruang aman. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
