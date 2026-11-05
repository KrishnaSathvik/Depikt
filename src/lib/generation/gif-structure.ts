/** Bounded envelope walk before the GIF library: reject unknown blocks and truncation. */
export function assertGifStructure(bytes: Uint8Array): void {
  let offset = 13;
  const take = (size: number) => {
    if (offset + size > bytes.length) throw new Error("Truncated GIF block");
    offset += size;
  };
  const byte = () => {
    if (offset >= bytes.length) throw new Error("Truncated GIF");
    return bytes[offset++];
  };
  const blocks = () => {
    let size = byte();
    while (size) {
      take(size);
      size = byte();
    }
  };
  const packed = bytes[10];
  if (packed & 128) take(3 * 2 ** ((packed & 7) + 1));
  let frames = 0,
    extensions = 0;
  while (offset < bytes.length) {
    const marker = byte();
    if (marker === 0x3b) {
      if (offset !== bytes.length || frames < 2) throw new Error("Unexpected GIF trailer");
      return;
    }
    if (marker === 0x2c) {
      if (++frames > 64) throw new Error("Too many GIF frames");
      take(8);
      const local = byte();
      if (local & 128) take(3 * 2 ** ((local & 7) + 1));
      const codeSize = byte();
      if (codeSize < 2 || codeSize > 8) throw new Error("Invalid GIF LZW code size");
      blocks();
    } else if (marker === 0x21) {
      if (++extensions > 512) throw new Error("Too many GIF extensions");
      const label = byte();
      if (label === 0xf9) {
        if (byte() !== 4) throw new Error("Invalid GIF control block");
        take(4);
        if (byte() !== 0) throw new Error("Invalid GIF terminator");
      } else if (label === 0xff || label === 0xfe) blocks();
      else throw new Error("Unsupported GIF extension");
    } else throw new Error("Unknown GIF block");
  }
  throw new Error("Missing GIF trailer");
}
