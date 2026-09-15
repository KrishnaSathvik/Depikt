// Native image generation — precision-edit prompt assembly.
//
// Masked edits do not re-run the Intent writer. They prepend a short
// instruction to change only the selected region and keep unselected
// content, then the user's request. This is string assembly, not a
// model call. Do not promise a pixel-perfect lock.

export function withPrecisionEditPreamble(prompt: string, mustPreserve: string[] = []): string {
  const assembled = `Change only the selected region according to the request.
Preserve all unselected content, composition, camera angle,
lighting, object positions, text, and identity unless the
requested edit requires a small local boundary adjustment.

REQUEST:
${prompt.trim()}`;
  if (mustPreserve.length > 0) {
    return `${assembled}\n\nPreserve: ${mustPreserve.join("; ")}.`;
  }
  return assembled;
}
