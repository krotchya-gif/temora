import { describe, expect, it } from "vitest";
import { isUuid, themeAccent } from "@/lib/events";
import {
  eventCreateSchema,
  eventUpdateSchema,
  firstIssueMessage,
} from "@/lib/validation/event";
import { humanAuthError, loginSchema, signupSchema } from "@/lib/validation/auth";
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

  it("menerima isActive boolean", () => {
    expect(eventUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(eventUpdateSchema.safeParse({ isActive: "ya" }).success).toBe(false);
  });
});

describe("firstIssueMessage", () => {
  it("mengambil pesan issue pertama untuk ditampilkan di form", () => {
    const result = eventCreateSchema.safeParse({ name: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe(result.error.issues[0].message);
    }
  });

  it("fallback pesan umum bila error tanpa issue", () => {
    // ZodError buatan tanpa issues → pesan cadangan "Data belum lengkap."
    const fake = { issues: [] } as never;
    expect(firstIssueMessage(fake)).toBe("Data belum lengkap.");
  });
});

describe("tablesGenerateSchema", () => {
  it("count di luar 1–50 ditolak", () => {
    expect(tablesGenerateSchema.safeParse({ count: 0 }).success).toBe(false);
    expect(tablesGenerateSchema.safeParse({ count: 51 }).success).toBe(false);
    expect(tablesGenerateSchema.safeParse({ count: 20 }).success).toBe(true);
  });
});

describe("signupSchema / loginSchema", () => {
  it("signup menolak nama pendek, email invalid, password pendek", () => {
    expect(signupSchema.safeParse({ name: "A", email: "x", password: "123" }).success).toBe(false);
    expect(
      signupSchema.safeParse({ name: "Near", email: "near@temora.id", password: "rahasia123" })
        .success,
    ).toBe(true);
  });

  it("login wajib password terisi", () => {
    expect(loginSchema.safeParse({ email: "a@b.id", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.id", password: "x" }).success).toBe(true);
  });
});

describe("humanAuthError (task 003 §7 — copy ramah)", () => {
  it("memetakan error teknis Supabase ke kalimat manusia", () => {
    expect(humanAuthError("Invalid login credentials")).toBe("Email atau kata sandi belum pas.");
    expect(humanAuthError("Email not confirmed")).toBe("Email kamu belum diverifikasi. Cek inbox ya.");
    expect(humanAuthError("User already registered")).toBe("Email ini sudah terdaftar. Coba masuk saja.");
    expect(humanAuthError("Request rate limit reached")).toBe("Terlalu banyak percobaan. Coba lagi beberapa menit.");
    expect(humanAuthError("Password should be at least 8 characters")).toBe("Kata sandi minimal 8 karakter.");
  });

  it("fallback pesan umum untuk error tak dikenal", () => {
    expect(humanAuthError("unknown weird error")).toBe(
      "Ada yang salah di server kami. Coba beberapa saat lagi.",
    );
  });
});
