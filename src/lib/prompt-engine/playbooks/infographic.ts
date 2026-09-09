import type { Playbook } from "./index.ts";

export const infographic: Playbook = {
  id: "infographic",
  title: "Infographic / diagram / slide",
  guidance: `Lock the structure before the styling. State the exact number of sections, modules, steps, or columns, and name each one in reading order. Say whether the layout is a vertical stack, horizontal flow, grid, timeline, comparison table, or a single slide, and how the eye moves through it.
For each section give its label and one concise line of content. Use only facts, numbers, and labels the user supplied; if a value is needed but missing, use a bracketed placeholder like [VALUE] or [YEAR]. Never invent statistics, percentages, dates, or rankings.
Describe the role of icons or diagram elements (an arrow between steps, an icon per section, a bar per value) without over-specifying their art. Keep the palette small and name it. Keep copy short enough to render legibly.
Presentation slides: state the slide format, title placement, and that layout, colors, and typography must match the established design when the user is continuing a deck.
End with the text-control sentence: only the listed labels and copy may appear, spelled exactly; no extra sections.`,
};
