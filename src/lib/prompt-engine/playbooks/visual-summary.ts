import type { Playbook } from "./index.ts";

export const visualSummary: Playbook = {
  id: "visual_summary",
  title: "Visual summary",
  guidance: `Summarize only the information the user supplied or the source contains. Decide the hierarchy: one title, three to six key points or sections in reading order, each with a short label and one concise line.
State the layout (one-pager, single slide, vertical card) and how sections are separated. Name the palette and type character briefly.
Never fabricate figures, quotes, or conclusions. Where the summary needs a value the user did not give, use a bracketed placeholder such as [KEY METRIC]. Quote any exact wording the user wants kept.
End with the text-control sentence: only the listed copy may appear, spelled exactly; no invented sections.`,
};
