/** Optional browser-only PNG export; never replaces the stored vector original. */
export async function exportSvgPreviewPng(
  url: string,
  width: number,
  height: number,
): Promise<Blob> {
  if (width * height > 8_294_400) throw new Error("Preview is too large");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load vector");
  const { sanitizeSvg } = await import("./media.ts");
  const safe = sanitizeSvg(new Uint8Array(await response.arrayBuffer()));
  const objectUrl = URL.createObjectURL(
    new Blob([safe.bytes as BlobPart], { type: "image/svg+xml" }),
  );
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
