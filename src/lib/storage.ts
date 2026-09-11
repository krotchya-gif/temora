// Hostinger media service adapter.
// Database/Auth/Realtime tetap di Supabase; file tidak lagi disimpan di Supabase Storage.

type MediaArea = "photos" | "thumbs" | "frames" | "covers" | "sponsors" | "showcase" | "zips";

function baseUrl() {
  return (process.env.HOSTINGER_MEDIA_URL || process.env.NEXT_PUBLIC_HOSTINGER_MEDIA_URL || "https://media.temora.site").replace(/\/$/, "");
}

function secret() {
  const value = process.env.HOSTINGER_STORAGE_SECRET;
  if (!value) throw new Error("HOSTINGER_STORAGE_SECRET belum dikonfigurasi.");
  return value;
}

function safeKey(key: string) {
  if (!/^(photos|thumbs|frames|covers|sponsors|showcase|zips)\/[A-Za-z0-9._/-]+$/.test(key) || key.includes("..")) throw new Error("Invalid media key.");
  return key;
}

export function publicStorageUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl()}/public/${safeKey(path)}`;
}

export async function uploadStorageFile(key: string, body: Blob | Buffer | ArrayBuffer | Uint8Array | string, contentType: string) {
  const form = new FormData();
  form.append("key", safeKey(key));
  form.append("file", new Blob([body as unknown as BlobPart], { type: contentType }), key.split("/").pop());
  const response = await fetch(process.env.HOSTINGER_UPLOAD_URL || `${baseUrl()}/upload.php`, {
    method: "POST",
    headers: { "X-Storage-Secret": secret() },
    body: form,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`media upload failed (${response.status})`);
  return (await response.json()) as { ok: true; key: string; url?: string };
}

export async function downloadStorageFile(key: string) {
  const response = await fetch(`${baseUrl()}/media-get.php?key=${encodeURIComponent(safeKey(key))}`, { headers: { "X-Storage-Secret": secret() }, cache: "no-store" });
  if (!response.ok) throw new Error(`media download failed (${response.status})`);
  return { bytes: await response.arrayBuffer(), contentType: response.headers.get("content-type") || "application/octet-stream" };
}

export async function deleteStorageFile(key: string) {
  const response = await fetch(`${baseUrl()}/delete.php`, { method: "POST", headers: { "Content-Type": "application/json", "X-Storage-Secret": secret() }, body: JSON.stringify({ key: safeKey(key) }), cache: "no-store" });
  return response.ok;
}

export async function deleteStoragePrefix(keyPrefix: string) {
  const prefix = keyPrefix.replace(/^\/+|\/+$/g, "");
  const response = await fetch(`${baseUrl()}/delete.php`, { method: "POST", headers: { "Content-Type": "application/json", "X-Storage-Secret": secret() }, body: JSON.stringify({ prefix }), cache: "no-store" });
  return response.ok;
}

/** Kompatibilitas purge lama: bucket Supabase menjadi prefix key Hostinger. */
export async function removePrefix(_admin: unknown, bucket: MediaArea, prefix: string): Promise<number> {
  return (await deleteStoragePrefix(`${bucket}/${prefix}`)) ? 1 : 0;
}
