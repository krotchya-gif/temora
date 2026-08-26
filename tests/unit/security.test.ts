import { describe, expect, it } from "vitest";
import {
  isJpegBuffer,
  isSameOrigin,
  sanitizeSearchQuery,
  timingSafeEqualStr,
} from "@/lib/security";

describe("sanitizeSearchQuery", () => {
  it("membuang metakarakter or() PostgREST", () => {
    // Payload injection klasik: mencoba menambah kondisi email.eq.
    const payload = "a%,email.eq.victim@x.com,name.ilike.%a";
    expect(sanitizeSearchQuery(payload)).not.toContain(",");
  });

  it("membuang tanda kurung grup", () => {
    expect(sanitizeSearchQuery("foo)(bar")).toBe("foobar");
  });

  it("membiarkan karakter pencarian wajar", () => {
    expect(sanitizeSearchQuery("budi santoso 2026")).toBe(
      "budi santoso 2026",
    );
    expect(sanitizeSearchQuery("budi@mail.com")).toContain("@");
  });

  it("menangani null/kosong dan memotong panjang", () => {
    expect(sanitizeSearchQuery(null)).toBe("");
    expect(sanitizeSearchQuery("   ")).toBe("");
    expect(sanitizeSearchQuery("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe("isJpegBuffer", () => {
  it("menerima JPEG asli (FFD8FF)", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(isJpegBuffer(jpeg)).toBe(true);
  });

  it("menolak MIME palsu: HTML/PNG/teks", () => {
    const html = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]); // <html
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    expect(isJpegBuffer(html)).toBe(false);
    expect(isJpegBuffer(png)).toBe(false);
  });

  it("menolak buffer terlalu pendek", () => {
    expect(isJpegBuffer(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });
});

describe("isSameOrigin", () => {
  const makeRequest = (url: string, headers: Record<string, string>) =>
    new Request(url, { method: "POST", headers });

  it("Origin cocok dengan host → true", () => {
    const req = makeRequest("https://temora.id/api/x", {
      origin: "https://temora.id",
      host: "temora.id",
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it("Origin berbeda → false", () => {
    const req = makeRequest("https://temora.id/api/admin/vendors/x/tier", {
      origin: "https://evil.example",
      host: "temora.id",
    });
    expect(isSameOrigin(req)).toBe(false);
  });

  it("Origin absen (non-browser) → true", () => {
    const req = makeRequest("https://temora.id/api/auth/login", {
      host: "temora.id",
    });
    expect(isSameOrigin(req)).toBe(true);
  });
});

describe("timingSafeEqualStr", () => {
  it("sama persis → true", () => {
    expect(timingSafeEqualStr("abc123", "abc123")).toBe(true);
  });

  it("beda isi / beda panjang → false", () => {
    expect(timingSafeEqualStr("abc124", "abc123")).toBe(false);
    expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
  });
});
