import type { StoredImage } from "./openai-images.ts";

export type { StoredImage };

export async function assembleJobImages(args: {
  download: (path: string) => Promise<StoredImage | null>;
  sourcePath: string | null;
  referencePaths: string[];
  maskPath: string | null;
}): Promise<{ referenceImages: StoredImage[]; editMask: StoredImage | null }> {
  const referenceImages: StoredImage[] = [];
  if (args.sourcePath) {
    const source = await args.download(args.sourcePath);
    if (source) referenceImages.push(source);
  }
  for (const path of args.referencePaths) {
    const ref = await args.download(path);
    if (ref) referenceImages.push(ref);
  }
  let editMask: StoredImage | null = null;
  if (args.maskPath) {
    editMask = await args.download(args.maskPath);
  }
  return { referenceImages, editMask };
}
