import type { Playbook } from "./index.ts";

export const storyboard: Playbook = {
  id: "storyboard",
  title: "Storyboard / multi-panel / sequence",
  guidance: `First decide the unit from the intent: one image containing panels (unit "panel") or several separate images (unit "page"/"slide"). Produce exactly the requested count. Count before finishing.
Begin with a CONSISTENT ELEMENTS block that fixes everything that must not drift: character or product appearance (hair, clothing, colors, distinctive features), visual style and medium, palette, lighting logic, and any wardrobe or product state.
Single image with panels: state the grid or strip layout (2x2, 3 in a row, 5 equal panels left to right), then one line per panel numbered "Panel 1:", "Panel 2:", … with shot type, action, setting beat, and emotion. Say that every panel shows the same character with identical features and proportions.
Separate pages or slides: write one block per unit labeled "PAGE 1:", "PAGE 2:", … (or "SLIDE 1:" …), each with its own layout and content, restating the consistency anchors in one line per unit. Say that each is generated as a separate image and that the CONSISTENT ELEMENTS block applies to every one.
When continuing an existing series, say the new unit must match the established design, character state, and palette exactly, and carry forward previously approved details.`,
};
