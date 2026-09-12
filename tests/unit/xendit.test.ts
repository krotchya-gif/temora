import { afterEach, describe, expect, it } from "vitest";
import { verifyCallbackToken } from "@/lib/xendit";

describe("verifyCallbackToken (constant-time)", () => {
  const original = process.env.XENDIT_WEBHOOK_TOKEN;

  afterEach(() => {
    if (original === undefined) delete process.env.XENDIT_WEBHOOK_TOKEN;
    else process.env.XENDIT_WEBHOOK_TOKEN = original;
  });

  it("token cocok → true", () => {
    process.env.XENDIT_WEBHOOK_TOKEN = "rahasia-webhook-token";
    expect(verifyCallbackToken("rahasia-webhook-token")).toBe(true);
  });

  it("token salah / kosong / env tidak ada → false tanpa side effect", () => {
    process.env.XENDIT_WEBHOOK_TOKEN = "rahasia-webhook-token";
    expect(verifyCallbackToken("salah")).toBe(false);
    expect(verifyCallbackToken("")).toBe(false);
    expect(verifyCallbackToken(null)).toBe(false);

    delete process.env.XENDIT_WEBHOOK_TOKEN;
    expect(verifyCallbackToken("rahasia-webhook-token")).toBe(false);
  });
});
