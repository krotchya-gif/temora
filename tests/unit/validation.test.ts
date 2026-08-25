import { describe, expect, it } from "vitest";
import { isUuid, themeAccent } from "@/lib/events";
import {
  eventCreateSchema,
  eventUpdateSchema,
} from "@/lib/validation/event";
import { tablesGenerateSchema } from "@/lib/validation/photobooth";

describe("isUuid", () => {
  it("menerima UUID kanonik", () => {
    expect(isUuid("00000000-0000-4000-8000-0000000000e1")).toBe(true);
  });
  it("menolak slug", () => {
    expect(isUuid("pernikahan-dev")).toBe(false);
  });
});

describe("themeAccent (design-system §2.2)", () => {
  it("memetakan tema ke token yang benar", () => {
    expect(themeAccent("wedding")).toBe("var(--color-muted-mauve)");
    expect(themeAccent("birthday")).toBe("var(--color-dusty-blue)");
    expect(themeAccent("corporate")).toBe("var(--color-accent)");
    expect(themeAccent("community")).toBe("var(--color-accent-secondary)");
  });
  it("fallback ke accent untuk tema tak dikenal/null", () => {
    expect(themeAccent(null)).toBe("var(--color-accent)");
    expect(themeAccent("halloween")).toBe("var(--color-accent)");
  });
});

describe("eventCreateSchema", () => {
  const base = { name: "Pernikahan Andi & Sinta" };

  it("menerima payload minimal dan default aktif", () => {
    const parsed = eventCreateSchema.parse(base);
    expect(parsed.isActive).toBe(true);
  });

  it("menolak nama terlalu pendek dengan pesan ramah", () => {
    const result = eventCreateSchema.safeParse({ name: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("minimal 3");
    }
  });

  it("slug valid sesuai pola database.md", () => {
    expect(
      eventCreateSchema.safeParse({ ...base, customSlug: "andi-sinta-2026" }).success,
    ).toBe(true);
    expect(
      eventCreateSchema.safeParse({ ...base, customSlug: "Andi Sinta!" }).success,
    ).toBe(false);
  });

  it("tanggal invalid ditolak", () => {
    expect(eventCreateSchema.safeParse({ ...base, startsAt: "besok" }).success).toBe(false);
  });
});

describe("eventUpdateSchema", () => {
  it("slug tidak termasuk field update (immutable)", () => {
    const parsed = eventUpdateSchema.parse({
      name: "Nama Baru",
      customSlug: "hack-attempt",
    } as Record<string, unknown>);
    expect("customSlug" in parsed).toBe(false);
  });
});

describe("tablesGenerateSchema", () => {
  it("count di luar 1–50 ditolak", () => {
    expect(tablesGenerateSchema.safeParse({ count: 0 }).success).toBe(false);
    expect(tablesGenerateSchema.safeParse({ count: 51 }).success).toBe(false);
    expect(tablesGenerateSchema.safeParse({ count: 20 }).success).toBe(true);
  });
});
