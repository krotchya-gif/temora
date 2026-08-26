// Helper keamanan lintas-route (task 019).
// Semua temuan berasal dari audit ronde 2 — lihat tasks/019 §2.

// ---- Sanitasi pencarian (anti filter-injection PostgREST) ---------------

/**
 * Bersihkan input pencarian sebelum disisipkan ke pola `.or(...)` PostgREST.
 * Metakarakter yang memungkinkan keluar dari template kondisi adalah
 * koma (pemisah kondisi) dan tanda kurung (grup) — dibuang mentah-mentah.
 * Wildcard LIKE (% _) dibiarkan: hanya melonggarkan pencarian si pemanggil.
 */
export function sanitizeSearchQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[,()]/g, "").trim().slice(0, 60);
}

// ---- Magic-byte validation ------------------------------------------------

/** Cek 3 byte pertama JPEG (FF D8 FF) — melindungi dari deklarasi MIME palsu. */
export function isJpegBuffer(bytes: Uint8Array | ArrayBuffer): boolean {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < 4) return false;
  return view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff;
}

/** Cek magic byte PNG (89 50 4E 47) untuk konten kurasi non-foto. */
export function isPngBuffer(bytes: Uint8Array | ArrayBuffer): boolean {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < 4) return false;
  return (
    view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47
  );
}

/** JPEG atau PNG — validasi konten kurasi showcase. */
export function isImageBuffer(bytes: Uint8Array | ArrayBuffer): boolean {
  return isJpegBuffer(bytes) || isPngBuffer(bytes);
}

// ---- Origin check (CSRF defense-in-depth) ---------------------------------

/**
 * True bila Origin (bila ada) cocok dengan Host request.
 * Origin absen = non-browser client (curl/cron internal) → diizinkan;
 * serangan CSRF lintas-situs di browser modern selalu membawa Origin.
 * Webhook eksternal & cron TIDAK boleh memakai cek ini.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const requestHost =
      request.headers.get("host") ?? new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

// ---- Perbandingan string constant-time ------------------------------------

/** Bandingkan secret/token tanpa membocorkan posisi mismatch via timing. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
