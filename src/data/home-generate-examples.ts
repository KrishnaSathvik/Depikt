/**
 * Homepage Generate demo: three real Images 2.5 results with short prompts
 * the composer types out. No API calls — the images are already on disk.
 */

export interface HomeGenerateExample {
  id: string;
  /** Chip label under the composer. */
  label: string;
  /** Text typed into the homepage composer. */
  prompt: string;
  /** File under public/library/images-2-5/. */
  slug: string;
  alt: string;
  aspect: "portrait" | "square" | "ticket";
}

export const HOME_GENERATE_EXAMPLES: readonly HomeGenerateExample[] = [
  {
    id: "travel-poster",
    label: "Travel poster",
    prompt:
      "A retro travel poster for Kyoto at dusk: Yasaka Pagoda up a narrow stone lane, two figures in kimono, title KYOTO, Japanese National Railways style.",
    slug: "showa-travel-poster-exact-title",
    alt: "Kyoto railway poster with exact title text",
    aspect: "portrait",
  },
  {
    id: "portrait",
    label: "Portrait",
    prompt:
      "An editorial portrait with 1980s neon lighting, a laser-grid backdrop in magenta and blue, period hair and a colour-block windbreaker.",
    slug: "80s-portrait-identity-lock",
    alt: "1980s studio portrait with the same face",
    aspect: "square",
  },
  {
    id: "ticket",
    label: "Ticket",
    prompt:
      "A vintage Lisbon travel ticket with the city name LISBON, a tram stamp, and Alfama at golden hour, cream card, exact printed text.",
    slug: "ticket-localization-edit",
    alt: "Vintage travel ticket localized from Tokyo to Lisbon",
    aspect: "ticket",
  },
] as const;
