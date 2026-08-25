import { describe, expect, it } from "vitest";
import { ulid } from "@/lib/ulid";

describe("ulid", () => {
  it("menghasilkan 26 karakter Crockford base32", () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]+$/);
  });

  it("prefix waktu monoton naik untuk timestamp berikutnya", () => {
    const a = ulid(1_000_000);
    const b = ulid(1_000_001);
    expect(b > a).toBe(true);
  });

  it("unik untuk panggilan beruntun di milidetik sama", () => {
    const ids = new Set(Array.from({ length: 200 }, () => ulid()));
    expect(ids.size).toBe(200);
  });
});
