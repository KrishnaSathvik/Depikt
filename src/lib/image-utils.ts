/**
 * Client-side reference-image preprocessing.
 *
 * Phase 2 behavior:
 *  - EXIF orientation is honored (createImageBitmap with imageOrientation
 *    "from-image", falling back to <img> which most browsers already orient).
 *  - Output format is chosen per source and intent: PNG when the image has
 *    transparency or when the reference intent needs crisp lines/text
 *    (sketch, composition, edit source, UI screenshots); JPEG otherwise.
 *  - Longest edge is capped (1024 px default) and a PNG that would exceed
 *    the size budget without transparency falls back to JPEG.
 */

export type OutputFormat = "image/png" | "image/jpeg";

export interface ProcessOptions {
  maxDim?: number;
  jpegQuality?: number;
  /** Prefer lossless output (sketch/layout/composition/edit source intents). */
  preferLossless?: boolean;
  /** Budget for the data URL in characters. Server rejects > 2 MB. */
  maxDataUrlChars?: number;
}

export interface ProcessedImage {
  dataUrl: string;
  mime: OutputFormat;
  width: number;
  height: number;
  hasAlpha: boolean;
  sourceMime: string;
}

export const DEFAULT_MAX_DIM = 1024;
export const DEFAULT_JPEG_QUALITY = 0.85;
export const DEFAULT_MAX_DATA_URL_CHARS = 1_800_000;

/** Pure decision: which output format to use. Exported for tests. */
export function chooseOutputFormat(opts: {
  sourceMime: string;
  hasAlpha: boolean;
  preferLossless: boolean;
}): OutputFormat {
  if (opts.hasAlpha) return "image/png";
  if (opts.preferLossless) return "image/png";
  if (
    opts.sourceMime === "image/png" ||
    opts.sourceMime === "image/gif" ||
    opts.sourceMime === "image/svg+xml"
  )
    return "image/png";
  return "image/jpeg";
}

/** Pure: scale (w,h) so the longest edge is <= maxDim. */
export function fitWithin(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = maxDim / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Sample the alpha channel; true if any sampled pixel is not fully opaque. */
export function detectAlpha(data: Uint8ClampedArray, stride = 16): boolean {
  for (let i = 3; i < data.length; i += 4 * stride) {
    if (data[i] < 255) return true;
  }
  return false;
}

async function decode(file: Blob): Promise<{
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
        close: () => bmp.close(),
      };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load image"));
    el.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    close: () => URL.revokeObjectURL(url),
  };
}

export async function processReferenceImage(
  file: Blob,
  opts: ProcessOptions = {},
): Promise<ProcessedImage> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const budget = opts.maxDataUrlChars ?? DEFAULT_MAX_DATA_URL_CHARS;
  const sourceMime = file.type || "image/jpeg";
  const src = await decode(file);
  try {
    const { width, height } = fitWithin(src.width, src.height, maxDim);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    src.draw(ctx, width, height);

    const mayHaveAlpha =
      sourceMime === "image/png" ||
      sourceMime === "image/webp" ||
      sourceMime === "image/gif" ||
      sourceMime === "image/svg+xml";
    const hasAlpha = mayHaveAlpha ? detectAlpha(ctx.getImageData(0, 0, width, height).data) : false;
    let mime = chooseOutputFormat({ sourceMime, hasAlpha, preferLossless: !!opts.preferLossless });
    let dataUrl =
      mime === "image/png"
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", quality);
    if (mime === "image/png" && dataUrl.length > budget && !hasAlpha) {
      // Too large for a lossless encode; JPEG at high quality is the safer trade.
      mime = "image/jpeg";
      dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    }
    return { dataUrl, mime, width, height, hasAlpha, sourceMime };
  } finally {
    src.close();
  }
}

/** Fetch an image URL (gallery flow) and process it like an upload. */
export async function urlToProcessedImage(
  url: string,
  opts: ProcessOptions = {},
): Promise<ProcessedImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  return processReferenceImage(blob, opts);
}

/** @deprecated kept for callers that only need a data URL. */
export async function resizeImageToBase64(
  file: File,
  maxDim = DEFAULT_MAX_DIM,
  quality = DEFAULT_JPEG_QUALITY,
): Promise<string> {
  return (await processReferenceImage(file, { maxDim, jpegQuality: quality })).dataUrl;
}

/** @deprecated kept for callers that only need a data URL. */
export async function urlToBase64(
  url: string,
  maxDim = DEFAULT_MAX_DIM,
  quality = DEFAULT_JPEG_QUALITY,
): Promise<string> {
  return (await urlToProcessedImage(url, { maxDim, jpegQuality: quality })).dataUrl;
}
