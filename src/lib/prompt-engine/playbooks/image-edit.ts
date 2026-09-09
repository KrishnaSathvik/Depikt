import type { Playbook } from "./index.ts";

export const imageEdit: Playbook = {
  id: "image_edit",
  title: "Image edit",
  guidance: `Write a bounded edit in three labeled blocks, in this order:

CHANGE ONLY: the exact requested change, naming the element and region ("the jacket worn by the person on the left", "the sky above the skyline"). Use "only" literally. No bonus edits, no restyling of untouched areas.

PRESERVE: everything that must stay identical. Enumerate the concrete items that apply: subject identity, face and expression, pose, hands, framing and crop, image proportions, background elements, other objects, lighting direction, colors, typography and logos, grain. When the user says "keep everything else", make this list exhaustive from what is known about the image.

MATCH: the new content must match the original perspective, light direction and quality, color temperature, shadows and reflections, material behavior, texture and grain, depth of field, and edge quality so the edit is seamless.

If this is a later step in a sequence, add the sentence: "Build on the current edited image and retain all previously approved changes."
Do not describe the whole scene from scratch; the source image already defines it.`,
};
