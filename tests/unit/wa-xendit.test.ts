import { afterEach, describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/whatsapp";
import { verifyCallbackToken } from "@/lib/xendit";

describe("normalizePhone (E.164 Indonesia, task 009 §4.2)", () => {
  const cases: [string, string | null][] = [
    ["081234567890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["0812 3456 7890", "6281234567890"],
    ["12345", null],
    ["bukan nomor", null],
    ["", null],
    [null as unknown as string, null],
  ];

  it.each(cases)("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

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
