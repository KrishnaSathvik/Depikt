/**
 * Prompt Recipes — answer-engine-optimized index.
 * Each recipe answers ONE specific question with a single citable prompt.
 * Designed for LLM crawlers (ChatGPT, Perplexity, Claude) to lift verbatim.
 */

export interface Recipe {
  slug: string;
  /** The question the recipe answers — used as title and h1. */
  question: string;
  /** Short ~10-word answer for cards, meta description, and TL;DR. */
  short_answer: string;
  /** Category tag for filtering. */
  category: string;
  /** The actual production-ready prompt. */
  prompt: string;
  /** One short paragraph explaining why this structure works. */
  why_it_works: string;
}

export const recipes: Recipe[] = [
  {
    slug: "minimalist-startup-logo-poster",
    question: "What's a prompt for a minimalist startup logo poster?",
    short_answer:
      "A 2:3 portrait poster with one geometric mark, brand wordmark, and restrained palette — copy below.",
    category: "Posters",
    prompt: `Minimalist startup logo poster, 2:3 portrait. Centered: a single geometric mark (overlapping circle and triangle, monoline construction, 4px stroke) in deep indigo on warm off-white background. Below the mark, brand wordmark "ACME" set in a humanist sans, all-caps, generous letter-spacing, near-black. Tiny mono caption bottom-center: "EST. 2026". Restrained palette: off-white #f5f3ee, deep indigo, near-black. Subtle paper grain, faint registration marks at corners. Risograph print feel. High legibility, museum gift-shop quality. No other text.`,
    why_it_works:
      "One mark, one wordmark, one accent color. A poster fails when it tries to do five things; minimalism comes from explicit subtraction, not vague \"minimal\" adjectives. Naming the construction (monoline, 4px stroke) gives the model something to render instead of inventing.",
  },
  {
    slug: "3-panel-storyboard-vertical",
    question: "What's a prompt for a 3-panel vertical storyboard?",
    short_answer:
      "A 3:4 canvas with three stacked 4:3 panels, one character anchor, three beats — copy below.",
    category: "Storyboards",
    prompt: `3-panel vertical storyboard, 3:4 portrait canvas, three stacked panels each 4:3, thin black border between panels. Character: a woman in her 30s, short black hair, denim jacket, round wire-frame glasses — same person in every panel. Panel 1: wide shot, character walks into a sunlit cafe doorway, golden hour from camera-right. Establishing. Panel 2: medium shot, character sits at a window seat, laptop open, looking out — pensive. Panel 3: close-up on the laptop screen showing a single line of handwritten-style text "I'm ready." Resolution. Shared style: cinematic 35mm film, warm golden palette, soft directional light, painterly storyboard wash. Consistent character throughout.`,
    why_it_works:
      "The 3-panel structure mirrors classic three-act setup–turn–resolution. The character anchor (specific physical features, repeated phrase) is what keeps the same person across panels — without it GPT Image 2 drifts to a new face every frame.",
  },
  {
    slug: "instagram-quote-card",
    question: "What's a prompt for an Instagram quote card?",
    short_answer:
      "A 4:5 portrait card with one quote in a serif display face, attribution, and a single accent — copy below.",
    category: "Social",
    prompt: `Instagram quote card, 4:5 portrait. Solid warm-cream background (#f5f0e8). Centered single quote in quotes: "The cave you fear to enter holds the treasure you seek." Set in a classic serif display face (think Caslon or Garamond), large, near-black, centered, 4-line break for rhythm. Attribution below in small mono caps: "— JOSEPH CAMPBELL". Single thin underline accent in burnt orange below the attribution. Subtle paper texture. Generous margins, 8-unit baseline grid. Editorial quality, magazine-feature feel. No other decoration.`,
    why_it_works:
      "One quote, one face, one accent. Most quote-card prompts fail by asking for ornaments or backgrounds; restraint is what makes them feel premium. Naming a specific typeface family (serif display, Caslon/Garamond) gets clean type instead of generic AI-serif mush.",
  },
  {
    slug: "saas-dashboard-mockup",
    question: "What's a prompt for a clean SaaS dashboard mockup?",
    short_answer:
      "A 16:10 desktop dashboard with sidebar, header, KPI row, and chart — copy below.",
    category: "UI Mockups",
    prompt: `Clean SaaS dashboard mockup, 16:10 landscape, MacBook frame, soft grey desk surface, subtle shadow. On screen: a product analytics dashboard. Left: narrow dark sidebar with 6 icon-and-label nav items, logo at top. Top: header with workspace name "Acme Analytics", search input, and avatar right. Main area: 4-column KPI row at top — each card shows a metric label ("MRR", "Active users", "Churn", "NPS"), a large number, and a tiny green/red delta. Below: a wide line chart titled "Revenue, last 30 days", smooth curve trending up, x-axis labels. Right rail: small activity feed with 4 entries. System: 8pt grid, humanist sans throughout, off-white background, near-black text, single deep-indigo accent. Pixel-clean, design-quality, real-feeling product.`,
    why_it_works:
      "Naming each region (sidebar / header / KPI row / chart / activity feed) gives the model an explicit layout to compose against. Quoting the exact labels prevents Lorem-ipsum garbage. The \"MacBook frame on grey desk\" framing sells it as a render, not a wireframe.",
  },
  {
    slug: "cinematic-portrait-golden-hour",
    question: "What's a prompt for a cinematic golden-hour portrait?",
    short_answer:
      "A 35mm film portrait, 85mm lens, golden-hour rim light, shallow depth — copy below.",
    category: "Cinematic",
    prompt: `Cinematic editorial portrait, 3:2 landscape, 35mm film. Subject: a man in his late 40s, weathered face, slight grey stubble, charcoal wool coat, looking off-camera right. Shot on Kodak Portra 400, 85mm lens at f/2.0, head-and-shoulders framing, subject placed on right third. Golden hour, low sun from camera-right creates strong rim light catching the hair and right shoulder. Soft fill from a white wall on the left. Background: out-of-focus warm city street, soft bokeh of distant street lamps. Fine film grain, gentle warm color cast, contrast slightly lifted. Quiet, contemplative mood. Magnum-style photojournalism.`,
    why_it_works:
      "Three reasons this lands: a specific lens and aperture (85mm f/2.0) drive composition and depth-of-field, a named film stock (Portra 400) anchors color, and a directional lighting setup (golden hour camera-right + soft fill left) gives the model an actual lighting plan. Vague \"cinematic\" prompts produce noise; named photographic vocabulary produces frames.",
  },
  {
    slug: "infographic-3-step-process",
    question: "What's a prompt for a 3-step process infographic?",
    short_answer:
      "A 4:5 vertical with title, three numbered steps, icons, and a brand strip — copy below.",
    category: "Infographics",
    prompt: `Editorial 3-step process infographic, 4:5 vertical, designed for social. Headline "How it works" in bold condensed sans, top-aligned, near-black. Subhead "Three steps from idea to image" in lighter grey below. Three horizontal numbered rows stacked vertically, each row: a large numeral ("01", "02", "03") on the left in deep indigo, a small flat 2-color line icon next to it, then a short step title ("Type your idea", "Get a structured prompt", "Generate the image") in bold and a one-line description in regular weight. Connecting hairline between rows. Bottom: thin brand strip with mono caption "depikt.app". Palette: off-white background, near-black ink, single deep-indigo accent. Humanist sans throughout. Subtle dot grid behind. Magazine-quality layout.`,
    why_it_works:
      "Numbered rows give the model an unambiguous layout. Quoting the exact step titles and the brand caption keeps the type legible. \"Two-color line icons\" is a constraint that prevents the model from inventing busy, mismatched illustrations for each step.",
  },
  {
    slug: "minimalist-product-packshot",
    question: "What's a prompt for a minimalist product packshot?",
    short_answer:
      "A 1:1 studio shot, 85mm macro, soft directional window light, one grounding detail — copy below.",
    category: "Product",
    prompt: `Studio product photograph, 1:1 square. A matte black ceramic skincare bottle (cylinder, slight taper, brushed aluminum cap) on a raw concrete surface, single dried eucalyptus sprig nearby casting a soft shadow. 85mm macro lens at f/2.8, bottle centered, surface texture sharp, background falls off softly. Soft directional window light from camera-left, late afternoon warm temperature, gentle fill from a white bounce on the right. Faint near-imperceptible water ring on the concrete beside the bottle. Editorial, Kinfolk-magazine quality. No text, no logo.`,
    why_it_works:
      "Generic product description (matte black ceramic, brushed aluminum cap) sidesteps trademark refusal. Real photographic specs (85mm macro, f/2.8, directional window light) drive a real composition. The water-ring detail is the one imperfection that flips the image from rendered to photographed.",
  },
  {
    slug: "mobile-onboarding-screen",
    question: "What's a prompt for a mobile app onboarding screen?",
    short_answer:
      "A 9:19.5 iPhone mockup with headline, illustration, primary CTA, and secondary link — copy below.",
    category: "UI Mockups",
    prompt: `Clean iPhone 15 mockup, 9:19.5 portrait, photographed on a soft grey desk, subtle device shadow. On screen: a mobile app onboarding screen, 4-region vertical stack. Top: status bar, small back arrow left, page indicator "1 / 3" right. Below: large bold headline "Ship sharper prompts" in humanist sans, near-black, 2-line break. Below in lighter grey: "Turn one sentence into a production-grade AI image prompt." Middle: flat 2-color line illustration of a paper airplane lifting off, single deep-indigo accent. Bottom: full-width primary CTA button labeled "Get started" — rounded 12px, deep indigo, white text, medium weight. Below it small text link "I already have an account". System: 8pt grid, 24px margins, off-white background, near-black ink, single deep-indigo accent. Pixel-clean, design-quality.`,
    why_it_works:
      "Quoting every label (\"1 / 3\", \"Ship sharper prompts\", \"Get started\") keeps the typography readable instead of garbled. The 4-region structure gives the model an explicit layout. The single named accent color is what prevents the random-color-soup look most AI UI mockups suffer from.",
  },
  {
    slug: "editorial-magazine-cover",
    question: "What's a prompt for an editorial magazine cover?",
    short_answer:
      "A 4:5 cover with masthead, one strong portrait, headline, and cover lines — copy below.",
    category: "Posters",
    prompt: `Editorial magazine cover, 4:5 portrait. Masthead at top: "ATLAS" set in a heavy condensed serif display face, all-caps, near-black, full-bleed width. Hero image: full-bleed editorial portrait of a woman in her 30s in a deep emerald turtleneck, head-and-shoulders, looking directly at camera, soft window light from camera-left, neutral grey background, Hasselblad medium-format quality. Headline overlaid bottom-left in white sans-serif, 3-line break: "The quiet rise of the part-time founder". Below in smaller white sans: "Issue 47 · Spring 2026". Two thin cover lines on the right edge in light grey caps: "Cities · Climate · Capital" and "12 essays on what comes next". Subtle paper grain, magazine print feel. No barcodes.`,
    why_it_works:
      "Magazine covers fail when prompts mix too many visual ideas. This locks one hero portrait, one headline, two cover lines — and quotes every text element so type renders cleanly. Naming the masthead typeface family (heavy condensed serif) gives the model an actual visual target instead of inventing one.",
  },
  {
    slug: "isometric-tech-illustration",
    question: "What's a prompt for an isometric tech illustration?",
    short_answer:
      "A 1:1 isometric scene with named components, restricted palette, and consistent line weight — copy below.",
    category: "Illustrations",
    prompt: `Isometric tech illustration, 1:1 square, 30-degree axonometric projection. A floating data-center cube: server racks stacked 3 high, glowing data streams flowing between them as thin lines, a small cloud icon hovering above connected by a dashed line, two abstract user avatars at the bottom corners. Flat 2-color line art, consistent 2px stroke weight throughout. Palette: off-white background, deep indigo as primary, soft coral as accent for the data streams. No gradients, no shadows beyond a single soft shadow under the cube. Clean, technical, Stripe-illustration quality.`,
    why_it_works:
      "Naming the projection angle (30-degree axonometric) is what makes it actually isometric. Consistent stroke weight (2px throughout) prevents the model from mixing line weights randomly. \"Stripe-illustration quality\" is a useful style anchor — the model has a clear mental model of that house style.",
  },
];

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug);
}
