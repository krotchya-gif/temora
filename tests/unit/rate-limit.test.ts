import { afterEach, describe, expect, it, vi } from "vitest";
import { allowRequest } from "@/lib/rate-limit";

describe("allowRequest (sliding window)", () => {
  afterEach(() => {
    // key unik per test menghindari kebocoran state antar kasus
  });

  it("mengizinkan sampai max lalu menolak", () => {
    const key = `t1-${Math.random()}`;
    expect(allowRequest(key, 2)).toBe(true);
    expect(allowRequest(key, 2)).toBe(true);
    expect(allowRequest(key, 2)).toBe(false);
  });

  it("window kedua setelah 60 detik mengizinkan lagi", () => {
    const key = `t2-${Math.random()}`;
    const realNow = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(realNow);

    expect(allowRequest(key, 1)).toBe(true);
    expect(allowRequest(key, 1)).toBe(false);

    nowSpy.mockReturnValue(realNow + 61_000);
    expect(allowRequest(key, 1)).toBe(true);
    nowSpy.mockRestore();
  });
});
