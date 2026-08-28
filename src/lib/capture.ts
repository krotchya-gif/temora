// Crop & transform bersama preview photobooth (design-system §3.3).
// Kontrak: preview == hasil — crop di sini identik dengan perilaku CSS
// `object-cover` (centered) pada stage 3:4, dipakai capture & overlay prop.

export const CAPTURE_RATIO = 3 / 4;

export type CropBox = { sx: number; sy: number; sw: number; sh: number };

/** Crop object-cover centered dari sumber (video/canvas) ke rasio 3:4. */
export function coverCrop(
  vw: number,
  vh: number,
  ratio = CAPTURE_RATIO,
): CropBox {
  if (vw / vh > ratio) {
    const sw = Math.round(vh * ratio);
    return { sx: Math.round((vw - sw) / 2), sy: 0, sw, sh: vh };
  }
  const sh = Math.round(vw / ratio);
  return { sx: 0, sy: Math.round((vh - sh) / 2), sw: vw, sh };
}

export type NormalizedBox = { x: number; y: number; w: number; h: number };

/**
 * Petakan kotak ternormalisasi (relatif sumber penuh, 0–1) ke ruang crop
 * (relatif window yang terlihat). Dipakai prop AR supaya posisi di preview
 * identik dengan di hasil foto.
 */
export function toCropSpace(
  box: NormalizedBox,
  crop: CropBox,
  vw: number,
  vh: number,
): NormalizedBox {
  const sxr = vw / crop.sw;
  const syr = vh / crop.sh;
  return {
    x: (box.x * vw - crop.sx) / crop.sw,
    y: (box.y * vh - crop.sy) / crop.sh,
    w: box.w * sxr,
    h: box.h * syr,
  };
}