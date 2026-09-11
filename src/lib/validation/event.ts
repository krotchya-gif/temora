import { z } from "zod";

// Format slug publik (database.md §2.2 constraint slug_format).
export const SLUG_PATTERN = /^[a-z0-9-]{6,60}$/;

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || !Number.isNaN(Date.parse(v)),
    "Tanggal tidak valid.",
  );

export const WATERMARK_POSITIONS = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
] as const;

export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

const optionalWatermarkText = z
  .string()
  .trim()
  .max(60, "Teks watermark maksimal 60 karakter.")
  .nullable()
  .optional()
  .transform((v) => (v === null ? null : v ? v : undefined));

export const eventCreateSchema = z.object({
  name: z.string().trim().min(3, "Nama event minimal 3 karakter.").max(80),
  theme: z
    .enum(["wedding", "birthday", "corporate", "community", "other"])
    .optional(),
  startsAt: optionalIsoDate,
  endsAt: optionalIsoDate,
  location: z.string().trim().max(120).optional(),
  customSlug: z
    .string()
    .trim()
    .regex(SLUG_PATTERN, "Pakai huruf kecil, angka, dan tanda hubung (6–60 karakter).")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional().default(true),
  watermarkText: optionalWatermarkText,
  watermarkPosition: z.enum(WATERMARK_POSITIONS).optional(),
});

export const eventUpdateSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  theme: z.enum(["wedding", "birthday", "corporate", "community", "other"]).optional(),
  startsAt: optionalIsoDate,
  endsAt: optionalIsoDate,
  location: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional(),
  watermarkText: optionalWatermarkText,
  watermarkPosition: z.enum(WATERMARK_POSITIONS).optional(),
  coverTemplate: z.enum(["bloom", "rose", "mono", "night", "paper"]).optional(),
  coverImageUrl: z.string().url("URL foto cover tidak valid.").nullable().optional(),
  coverTitle: z.string().trim().max(80, "Judul cover maksimal 80 karakter.").nullable().optional(),
  coverSubtitle: z.string().trim().max(120, "Subjudul cover maksimal 120 karakter.").nullable().optional(),
  coverButtonText: z.string().trim().min(1).max(30, "Teks tombol maksimal 30 karakter.").optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

/** Pesan error pertama dalam bentuk ramah untuk ditampilkan di form. */
export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "Data belum lengkap.";
}
