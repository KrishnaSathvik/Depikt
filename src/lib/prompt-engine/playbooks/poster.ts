import type { Playbook } from "./index.ts";

export const poster: Playbook = {
  id: "poster",
  title: "Poster / cover",
  guidance: `Open with the format (poster, cover, flyer, wallpaper) and the ratio if known. Give the design one focal point and a clear hierarchy: what is read first, second, third.
Text: quote every piece of copy exactly as the user wrote it, in the order it should be read, with a role for each (headline, subline, date line, credit). Say where each block sits (top third, centered, bottom-left) and its alignment. Describe typographic character in plain words (heavy condensed sans, elegant high-contrast serif, monospaced caption) rather than naming fonts unless the user did. If a required fact is missing (date, venue, price), write a bracketed placeholder such as [DATE] and never invent it.
Describe the image or background treatment in one or two sentences, then the palette (two or three named colors). Mention negative space and safe margins so text is not crowded.
End with one text-control sentence that matches the copy situation: when the user supplied all the copy, the design must contain only the quoted copy, spelled exactly, with no additional words, labels, or watermarks; when a required text region has no copy (a headline the user never wrote), describe that region's role instead of inventing words and say text appears only in the regions described. Never ask for example copy and forbid other text in the same prompt.`,
};
