// Client wrapper Xendit Invoice API + verifikasi callback token
// (architecture.md §2/§6, task 008 §4.1). Secret hanya di server.

const XENDIT_API_BASE = process.env.XENDIT_API_BASE ?? "https://api.xendit.co";

export type XenditInvoice = {
  id: string;
  invoice_url: string;
  status?: string;
};

export function isXenditConfigured(): boolean {
  return Boolean(process.env.XENDIT_SECRET_KEY);
}

/** Buat invoice Xendit; external_id = subscriptions.id (idempoten sisi kita). */
export async function createXenditInvoice(input: {
  externalId: string;
  amountIdr: number;
  description: string;
  payerEmail?: string;
  successRedirectUrl: string;
}): Promise<XenditInvoice> {
  const secret = process.env.XENDIT_SECRET_KEY;
  if (!secret) {
    throw new Error("xendit-not-configured");
  }

  const auth = Buffer.from(`${secret}:`).toString("base64");
  const response = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: input.externalId,
      amount: input.amountIdr,
      description: input.description,
      payer_email: input.payerEmail,
      success_redirect_url: input.successRedirectUrl,
      currency: "IDR",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[xendit] create invoice:", response.status, detail.slice(0, 300));
    throw new Error("xendit-create-failed");
  }

  return (await response.json()) as XenditInvoice;
}

/** Verifikasi header x-callback-token secara constant-time. */
export function verifyCallbackToken(headerToken: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || !headerToken) return false;
  if (headerToken.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= headerToken.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
