import type { Playbook } from "./index.ts";

export const ui: Playbook = {
  id: "ui",
  title: "UI mockup",
  guidance: `Describe a realistic production interface, not concept art. State the device and screen context (phone screen, desktop browser, tablet), then the information hierarchy top to bottom: navigation, headline or title area, primary content, secondary content, actions. Group components and describe spacing in plain terms (comfortable padding, clear separation between cards).
Name the visible labels, buttons, and data the user asked for; quote any exact copy. Describe the state being shown (empty, populated, error, selected). Describe the visual system briefly: palette, type character, corner radius, elevation.
Include only features the user asked for or that the reference screen already has. When redesigning an existing screenshot, list every existing feature, label, and navigation item that must remain, and say that no new functionality may be invented.
Quote the user's copy exactly. For labels and text regions the user did not specify, name the region and its role (primary button, section title, nav items) and keep them brief; do not write sample sentences labelled as example copy, and do not ask for lorem ipsum. Close with one text rule that matches what you described: text only in the named regions, spelled cleanly, nothing else.`,
};
