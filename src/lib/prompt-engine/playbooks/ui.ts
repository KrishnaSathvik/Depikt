import type { Playbook } from "./index.ts";

export const ui: Playbook = {
  id: "ui",
  title: "UI mockup",
  guidance: `Describe a realistic production interface, not concept art. State the device and screen context (phone screen, desktop browser, tablet), then the information hierarchy top to bottom: navigation, headline or title area, primary content, secondary content, actions. Group components and describe spacing in plain terms (comfortable padding, clear separation between cards).
Name the visible labels, buttons, and data the user asked for; quote any exact copy. Describe the state being shown (empty, populated, error, selected). Describe the visual system briefly: palette, type character, corner radius, elevation.
Include only features the user asked for or that the reference screen already has. When redesigning an existing screenshot, list every existing feature, label, and navigation item that must remain, and say that no new functionality may be invented.
Avoid lorem-ipsum instructions; give real example text where the user did not supply copy, keep it minimal, and mark it as example content.`,
};
