import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const COLORS = {
  card: "#FFFFFF",
  warm: "#F3EDE4",
  text: "#3D3A36",
  secondary: "#6B6660",
  accent: "#8B7355",
} as const;

const displayFont = path.join(
  process.cwd(),
  "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff",
);
const bodyFont = path.join(
  process.cwd(),
  "node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff",
);

export type PolaroidRenderInput = {
  image?: ArrayBuffer | Buffer | Uint8Array | null;
  eventName: string;
  caption?: string | null;
};

function escapeMarkup(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function textLayer(options: {
  text: string;
  fontfile: string;
  font: string;
  width: number;
  height: number;
  size: number;
  color: string;
  italic?: boolean;
}) {
  const style = options.italic ? "italic" : "normal";
  return sharp({
    text: {
      text: `<span foreground="${options.color}" font_size="${options.size * 1024}" font_style="${style}">${escapeMarkup(options.text)}</span>`,
      font: options.font,
      fontfile: options.fontfile,
      width: options.width,
      height: options.height,
      align: "left",
      wrap: "word-char",
      rgba: true,
      spacing: Math.round(options.size * 0.28),
    },
  }).png().toBuffer();
}

/** Render kartu JPEG adaptif; foto tidak pernah di-crop dan EXIF dihormati. */
export async function renderPolaroid(input: PolaroidRenderInput): Promise<Buffer> {
  const caption = input.caption?.trim() || null;
  let image: Buffer | null = null;
  let imageWidth = 0;
  let imageHeight = 0;

  if (input.image) {
    const oriented = sharp(input.image, { limitInputPixels: 40_000_000 }).autoOrient();
    const metadata = await oriented.metadata();
    const sourceWidth = metadata.width ?? 1200;
    const sourceHeight = metadata.height ?? 1600;
    const scale = Math.min(1, 2400 / Math.max(sourceWidth, sourceHeight));
    const rendered = await oriented
      .resize({
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale)),
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
      .toBuffer({ resolveWithObject: true });
    image = rendered.data;
    imageWidth = rendered.info.width;
    imageHeight = rendered.info.height;
  } else {
    imageWidth = 1200;
    imageHeight = 1180;
  }

  const shortEdge = Math.min(imageWidth, imageHeight);
  const padding = Math.max(36, Math.round(shortEdge * 0.045));
  const titleSize = Math.max(34, Math.round(shortEdge * 0.045));
  const bodySize = Math.max(22, Math.round(shortEdge * 0.026));
  const signatureSize = Math.max(17, Math.round(shortEdge * 0.019));
  const contentWidth = imageWidth;
  const titleHeight = Math.round(titleSize * 2.4);
  const captionHeight = caption ? Math.max(120, Math.round(bodySize * 6.8)) : 0;
  const signatureHeight = Math.round(signatureSize * 2.1);
  const footerGap = Math.round(padding * 0.55);
  const footerHeight =
    padding + titleHeight + (caption ? footerGap + captionHeight : 0) + footerGap + signatureHeight + padding;
  const canvasWidth = imageWidth + padding * 2;
  const canvasHeight = imageHeight + padding + footerHeight;

  const layers: OverlayOptions[] = [];
  if (image) {
    layers.push({ input: image, top: padding, left: padding });
  } else {
    const quoteSize = Math.max(52, Math.round(shortEdge * 0.075));
    const quote = await textLayer({
      text: caption ? `“${caption}”` : "Momen yang layak disimpan.",
      fontfile: displayFont,
      font: "Cormorant Garamond",
      width: contentWidth - padding * 2,
      height: imageHeight - padding * 3,
      size: quoteSize,
      color: COLORS.text,
      italic: true,
    });
    layers.push({ input: quote, top: padding * 2, left: padding * 2 });
  }

  const titleTop = imageHeight + padding * 2;
  const title = await textLayer({
    text: input.eventName.trim() || "Momen TEMORA",
    fontfile: displayFont,
    font: "Cormorant Garamond",
    width: contentWidth,
    height: titleHeight,
    size: titleSize,
    color: COLORS.text,
  });
  layers.push({ input: title, top: titleTop, left: padding });

  let signatureTop = titleTop + titleHeight + footerGap;
  if (caption && image) {
    const body = await textLayer({
      text: `“${caption}”`,
      fontfile: bodyFont,
      font: "Plus Jakarta Sans",
      width: contentWidth,
      height: captionHeight,
      size: bodySize,
      color: COLORS.secondary,
      italic: true,
    });
    layers.push({ input: body, top: titleTop + titleHeight + footerGap, left: padding });
    signatureTop += captionHeight + footerGap;
  }

  const signature = await textLayer({
    text: "Keep it close. Keep it TEMORA.",
    fontfile: bodyFont,
    font: "Plus Jakarta Sans",
    width: contentWidth,
    height: signatureHeight,
    size: signatureSize,
    color: COLORS.accent,
  });
  layers.push({ input: signature, top: signatureTop, left: padding });

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: image ? COLORS.card : COLORS.warm,
    },
  })
    .composite(layers)
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
