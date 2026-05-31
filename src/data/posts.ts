export interface PostFaqItem {
  question: string;
  answer: string;
}

export interface Post {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  read_time: string;
  published: string;
  excerpt: string;
  seo_title: string;
  seo_description: string;
  /** Optional cover image URL (relative or absolute). Used for og:image and twitter:image. */
  cover_image?: string;
  /** Optional FAQ section emitted as FAQPage JSON-LD. */
  faq?: PostFaqItem[];
  content: string;
}

export const posts: Post[] = [
  {
    slug: "how-to-prompt-gpt-image-2-for-logos",
    title: "How to prompt GPT Image 2 for logos and brand marks",
    subtitle: "The four-block prompt structure that gets clean, scalable, on-brief logo concepts — not generic AI mush.",
    category: "How-to",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-05-31",
    excerpt:
      "GPT Image 2 can spit out genuinely usable logo directions if you brief it like a designer. Here's the four-block structure: concept, mark type, type system, finish — plus copy-paste templates.",
    seo_title: "How to Prompt GPT Image 2 for Logos (2026 Guide)",
    seo_description:
      "The exact four-block prompt structure for generating clean, scalable logo concepts with GPT Image 2 — concept, mark type, typography, finish. Templates included.",
    faq: [
      {
        question: "Can GPT Image 2 design a usable logo?",
        answer:
          "It produces strong concept directions — wordmarks, monograms, simple geometric marks, and emblem-style logos. Use the output as a starting point: redraw the final mark in vector (Figma, Illustrator) for scalability and edge cleanup.",
      },
      {
        question: "What aspect ratio should I use for a logo prompt?",
        answer:
          "1:1 square for standalone marks. 16:9 or 4:5 if you want a horizontal lockup with wordmark next to symbol. Always state \"centered on a clean white background, generous padding\" so the model gives you a usable crop.",
      },
      {
        question: "Why do my AI logos look generic?",
        answer:
          "Three reasons: no concept anchor (vague brief), too many stylistic adjectives (pick one direction), and no constraint on detail. Add \"flat, single-color, no gradients, no 3D, no drop shadows\" to force the model into real logo territory.",
      },
    ],
    content: `
## The four-block structure

Every logo prompt that gets a usable result has four blocks:

1. **Concept** — what the brand is, what it stands for, one metaphor
2. **Mark type** — wordmark, monogram, symbol, emblem, lockup
3. **Type system** — font character (geometric sans, humanist serif, etc.)
4. **Finish** — flat vs dimensional, color count, background

## Working template

> Logo design for "[BRAND NAME]", a [one-line description of the company]. Style: **minimalist [mark type]**, inspired by [one reference: Swiss design / 70s record labels / modernist architecture]. Mark concept: [single metaphor — e.g. "an abstract mountain formed from two overlapping triangles"]. Typography: **geometric sans**, lowercase, tight letter-spacing. Flat, single-color (deep navy on off-white), no gradients, no 3D, no drop shadows. Centered on a clean white background, generous padding. Vector-style, scalable, professional brand identity.

## Why each block matters

### Concept

The single biggest reason AI logos look generic: no anchor. "A logo for a coffee shop" gives you a generic cup-and-steam mark. "A logo for a coffee shop, mark concept: a single coffee bean formed from a crescent moon" gives you a real idea.

One metaphor. One sentence. That's the concept block.

### Mark type

Pick one and name it:

- **Wordmark** — the name styled as the logo (Google, eBay)
- **Monogram** — initials as the mark (HBO, IBM)
- **Symbol** — abstract or representational mark (Nike swoosh, Apple)
- **Emblem** — text inside a contained shape (Starbucks, Harley)
- **Lockup** — symbol + wordmark side by side

Mixing types confuses the model. Pick one per generation.

### Type system

Don't say "modern font." Say:

- "Geometric sans, lowercase, tight letter-spacing" (Futura territory)
- "Humanist sans, sentence case, generous tracking" (Gill Sans territory)
- "Slab serif, all caps, condensed" (newspaper / sports brand)
- "Neo-grotesque, all caps, standard tracking" (Helvetica territory)

### Finish

This is the constraint block that kills the AI-mush look:

- **Flat, single-color, no gradients, no 3D, no drop shadows** — forces real logo territory
- **Centered on a clean white background, generous padding** — gives you a usable crop
- **Vector-style, scalable** — pushes toward simple shapes, not photorealistic

## Common failure modes

**Too many adjectives.** "Modern minimalist playful elegant bold sophisticated logo" → muddy generic mark. Pick two adjectives max.

**No background spec.** Model defaults to busy texture. Always specify "clean white background."

**Asking for text without quoting it.** Always put the brand name in quotes. Otherwise the model renders a phonetic guess.

## Skip the rewrite

[Depikt's generator](/generate) detects logo intent and applies this four-block structure automatically. Browse the [library](/library) for logo prompt examples you can copy directly, or grab a ready-made recipe from the [prompt templates index](/templates).
`,
  },
  {
    slug: "how-to-prompt-gpt-image-2-for-infographics",
    title: "How to prompt GPT Image 2 for infographics and diagrams",
    subtitle: "The five-block structure that gets clean labels, real data marks, and a readable hierarchy.",
    category: "How-to",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-05-31",
    excerpt:
      "GPT Image 2 can render genuinely usable infographics — but only if you treat the prompt like a brief, not a vibe. Here's the five-block structure: format, hierarchy, data, type system, and finish.",
    seo_title: "How to Prompt GPT Image 2 for Infographics (2026 Guide)",
    seo_description:
      "The exact five-block prompt structure for getting clean, readable infographics and diagrams out of GPT Image 2 — format, hierarchy, data, type, finish.",
    faq: [
      {
        question: "Can GPT Image 2 render real charts and graphs?",
        answer:
          "Yes — bar charts, line charts, sparklines, simple flow diagrams, and step graphics all render legibly if you specify the chart type, axis labels in quotes, and an approximate data shape (e.g. \"5 bars trending up from 12 to 47\").",
      },
      {
        question: "What aspect ratio works best for infographics?",
        answer:
          "9:16 portrait for vertical scroll feeds, 4:5 for Instagram, 16:9 for slides, 1:1 for square social. Always state it explicitly or the model defaults to 1:1.",
      },
      {
        question: "Why are my infographic labels garbled?",
        answer:
          "Two main causes: too many labels at once (keep it under 8 text elements), or labels not in quotes. Quote every label string exactly, and keep each one short (1–4 words).",
      },
    ],
    content: `
## The structure

Every infographic prompt that works for GPT Image 2 has five blocks:

1. **Format** — aspect ratio, canvas type, intended use
2. **Hierarchy** — title, subtitle, sections, in that order
3. **Data** — what visualizations, what shape, what scale
4. **Type system** — font style, weight, casing, alignment
5. **Finish** — palette, grid, paper feel, brand strip

## Working template

> Editorial infographic, **4:5 vertical**, designed for social. Headline "[YOUR HEADLINE]" in bold condensed sans, top-aligned. Subhead "[SUBHEAD]" in light grey below. Three labeled sections stacked vertically:
> 1. A 5-bar chart trending up, bars labeled "[A]", "[B]", "[C]", "[D]", "[E]"
> 2. A small ring chart showing 64% / 36% split, label "[METRIC]"
> 3. A 4-step horizontal flow with labels "[STEP 1] → [STEP 2] → [STEP 3] → [STEP 4]"
> Type: humanist sans throughout. Palette: off-white background, deep navy ink, one coral accent for emphasis. Subtle dot grid behind. Small mono caption at bottom: "[SOURCE / DATE]". Editorial polish, magazine-quality layout.

## Why each block matters

### Format

GPT Image 2 defaults to 1:1. **State the ratio explicitly.** "4:5 vertical," "9:16 story," "16:9 slide." Without it, your data gets squished into a square.

### Hierarchy

Treat the prompt like a wireframe. Top to bottom: title → subtitle → sections. Number the sections. The model uses ordering as layout intent.

### Data

Be specific about chart type AND shape:

- ❌ "a chart showing growth"
- ✅ "a 5-bar chart trending up from 12 to 47, x-axis labels Jan–May"

Without a shape cue, the model invents a generic placeholder chart. With one, you get something close to what you actually want.

### Type system

Pick ONE font style and stick with it. "Humanist sans throughout." "Slab serif for headers, grotesk for body." Mixing more than two type families confuses the model.

### Finish

This is what separates "AI infographic" from "designed object":

- Subtle dot grid or baseline grid behind
- Small mono caption with source + date
- Restricted palette: background + ink + one accent
- "Magazine-quality layout"

## Skip the rewrite

[Depikt's generator](/generate) detects infographic intent and applies this five-block structure automatically. The [library](/library) has dozens of infographic prompts you can copy directly.
`,
  },
  {
    slug: "how-to-prompt-gpt-image-2-for-ui-mockups",
    title: "How to prompt GPT Image 2 for UI mockups",
    subtitle: "Get pixel-clean app screens, dashboards, and onboarding flows out of GPT Image 2 — without the AI mush.",
    category: "How-to",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-05-31",
    excerpt:
      "GPT Image 2 can render screens that look like real product design — clean grids, legible labels, real-feeling components. The trick is prompting it like a designer briefing a junior, not like an artist describing a feeling.",
    seo_title: "How to Prompt GPT Image 2 for UI Mockups (2026 Guide)",
    seo_description:
      "The exact prompt structure for getting clean, design-quality UI mockups out of GPT Image 2 — device frame, layout grid, components, copy, and finish.",
    faq: [
      {
        question: "Can GPT Image 2 render real-looking app screens?",
        answer:
          "Yes — dashboards, mobile screens, onboarding flows, and settings pages all render convincingly. The trick is naming the device frame, the layout system, and the exact text inside the UI.",
      },
      {
        question: "Should I prompt for mobile or desktop UI?",
        answer:
          "Be explicit. \"iPhone 15 mockup, 9:19.5 portrait\" for mobile. \"Desktop dashboard, 16:10 landscape, MacBook frame\" for web. The wrong ratio is the most common reason a UI mockup looks wrong.",
      },
      {
        question: "How do I get readable buttons and labels?",
        answer:
          "Quote every label and CTA exactly (\"Sign in\", \"Get started\"). Keep individual labels under 4 words. Specify font weight (\"medium\", \"semibold\") and size relationship (\"primary CTA, larger than the secondary text link below\").",
      },
    ],
    content: `
## The structure

Every UI mockup prompt for GPT Image 2 has five parts:

1. **Frame** — device, aspect ratio, surrounding context
2. **Layout** — grid, regions, hierarchy
3. **Components** — each block named with its type
4. **Copy** — every label in quotes
5. **Finish** — color system, type, polish

## Working template

> Clean **iPhone 15 mockup, 9:19.5 portrait**, photographed on a soft grey desk surface, subtle shadow.
> On screen: a **mobile app onboarding flow**, 4-region vertical layout.
> Top: small **status bar**, **back arrow** left, page indicator "2 / 4" right.
> Middle: **large bold headline** "[HEADLINE, 6 WORDS MAX]" set in a humanist sans, near-black. Below in lighter grey: "[SUBHEAD, ONE SENTENCE]".
> Below headline: **simple illustration** — flat 2-color line art of [SUBJECT], single accent color.
> Bottom: **primary CTA button** labeled "[CTA TEXT]" — full-width, rounded 12px, deep indigo with white text. Below it a small **text link** "[SECONDARY LINK]".
> System: 8pt grid, 24px page margins. Palette: off-white background, near-black ink, one deep indigo accent. Pixel-clean, design-quality.

## Why each part matters

### Frame

Three options work reliably:

- **"iPhone 15 mockup, 9:19.5 portrait"** — mobile app screens
- **"Desktop dashboard, 16:10 landscape, MacBook frame"** — web apps
- **"Flat screen-only mockup, 9:16 vertical, no device chrome"** — embedded in landing pages

Always include the ratio. Without it you get a square that crops wrong on every preview.

### Layout

Name the grid. "8pt grid." "12-column layout." "4-region vertical stack." The model respects layout cues more than people expect — it just needs them named.

### Components

Use design vocabulary, not vibes:

- ❌ "a nice button"
- ✅ "primary CTA button, full-width, rounded 12px"

Words like *navbar*, *sidebar*, *card*, *toggle*, *segmented control*, *toast*, *tab bar* all map cleanly.

### Copy

Quote everything. "Sign in", "Get started", "2 / 4". The model renders quoted text far more accurately than paraphrased intent. Keep individual labels under 4 words.

### Finish

What separates "AI screenshot" from "designed screen":

- Named accent color, not "blue"
- Named font style ("humanist sans," "geometric grotesk")
- Pixel grid hint ("8pt grid")
- Soft device shadow, neutral desk surface — sells it as a render

## Skip the rewrite

[Depikt](/generate) detects UI intent and applies this structure automatically. Browse [UI mockup prompts in the library](/library) for proven starting points.
`,
  },
  {
    slug: "how-to-prompt-gpt-image-2-for-storyboards",
    title: "How to prompt GPT Image 2 for storyboards and multi-panel scenes",
    subtitle: "The exact structure for 3-, 4-, and 6-panel storyboards with consistent character and lighting.",
    category: "How-to",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-05-31",
    excerpt:
      "Storyboards are where GPT Image 2 shines and stumbles. Get the structure right and you get film-school-quality panels; get it wrong and you get four unrelated images on one canvas. Here's the structure that works.",
    seo_title: "How to Prompt GPT Image 2 for Storyboards (2026 Guide)",
    seo_description:
      "The exact prompt structure for getting consistent 3-, 4-, and 6-panel storyboards out of GPT Image 2 — grid, character anchor, panel beats, and shared style.",
    faq: [
      {
        question: "Can GPT Image 2 keep the same character across panels?",
        answer:
          "Yes — name a single character with 3–4 specific physical features (\"a woman in her 30s with short black hair, denim jacket, round glasses\") and repeat that exact phrase in each panel description.",
      },
      {
        question: "What's the best aspect ratio for a storyboard?",
        answer:
          "16:9 landscape for 4-panel grids, 3:4 portrait for 3-panel vertical, 2:3 for 6-panel comic style. State both the canvas ratio and the panel ratio.",
      },
      {
        question: "How many panels can I get in one image?",
        answer:
          "Up to 6 panels render reliably. Past that, individual panel quality drops fast — split into two prompts instead.",
      },
    ],
    content: `
## The structure

A working storyboard prompt has four parts:

1. **Grid** — canvas ratio + panel layout + panel ratio
2. **Character anchor** — one paragraph repeated in every panel
3. **Beats** — one short sentence per panel describing action + camera
4. **Shared style** — lighting, palette, medium, applied to every panel

## Working template

> **4-panel storyboard**, 2×2 grid, **16:9 landscape canvas**, each panel **16:9**, thin black border between panels.
> Character: **a man in his 40s, weathered face, grey beanie, navy parka** — same person in every panel.
> Panel 1: wide shot, character standing alone on a snowy ridge at dawn, looking right. Establishing.
> Panel 2: medium shot, character glances over shoulder, breath visible. Tension.
> Panel 3: close-up on character's eyes, narrow, focused. Decision beat.
> Panel 4: wide shot from behind, character walking toward camera-distant lodge lights. Resolution.
> Shared style: **cinematic 35mm film, cold blue-grey palette, soft directional dawn light, painterly storyboard wash**. Consistent character across all four panels.

## Why each part matters

### Grid

Three reliable formats:

- **3-panel vertical** — 3:4 canvas, panels stacked
- **4-panel 2×2 grid** — 16:9 canvas, four equal panels
- **6-panel comic style** — 2:3 canvas, 3 rows × 2 columns

State both the *canvas* ratio and the *panel* ratio. Without panel ratio cues, the model squishes panels into whatever shape is left over.

### Character anchor

Three to four specific physical features, exact same phrase every panel. The model's consistency is good when you give it a sharp anchor; it drifts when descriptions are loose.

- ❌ "the man" / "the same man" — drifts to a different face every panel
- ✅ "a man in his 40s, weathered face, grey beanie, navy parka" — stays consistent

### Beats

One sentence per panel. Include the **shot type** (wide, medium, close-up) and **the action** (looking, walking, deciding). Skip dialogue — it garbles.

### Shared style

The single line that makes the storyboard feel like one piece, not four images glued together. Lighting + palette + medium. Same phrase, every panel.

## Skip the rewrite

[Depikt's generator](/generate) recognizes storyboard intent and applies this structure automatically — including the character anchor and shared-style line.
`,
  },
  {
    slug: "how-to-prompt-gpt-image-2-for-product-shots",
    title: "How to prompt GPT Image 2 for product shots",
    subtitle: "Studio-quality product photography from a prompt — surface, lens, lighting, and the one detail most prompts skip.",
    category: "How-to",
    author: "Depikt Team",
    read_time: "5 min",
    published: "2026-05-30",
    excerpt:
      "GPT Image 2 produces genuinely usable product photography if you brief it like a studio photographer. The structure: surface, product, lens, lighting, and the grounding detail that sells the render as real.",
    seo_title: "How to Prompt GPT Image 2 for Product Shots (2026 Guide)",
    seo_description:
      "The exact prompt structure for getting studio-quality product photography out of GPT Image 2 — surface, lens, lighting, and the grounding detail most prompts miss.",
    faq: [
      {
        question: "Can GPT Image 2 produce e-commerce-quality product photos?",
        answer:
          "Yes — for hero shots, lifestyle scenes, and packshots. The key is specifying surface, lens, lighting direction, and adding one grounding detail (steam, condensation, soft shadow, fingerprint smudge) that breaks the \"too clean\" AI look.",
      },
      {
        question: "Should I name a real brand in the prompt?",
        answer:
          "GPT Image 2 will avoid rendering trademarked logos. Describe the product generically (\"a minimalist matte-black water bottle\") and add your own logo in post if needed.",
      },
      {
        question: "Why do my product shots look fake?",
        answer:
          "Almost always because they're too clean. Add one imperfection: a soft drop shadow, a faint smudge, a subtle reflection, a wisp of steam, condensation. That single detail flips the image from rendered to photographed.",
      },
    ],
    content: `
## The structure

Every product-shot prompt that works has five parts:

1. **Surface** — what the product sits on, what's around it
2. **Product** — generic description, materials, finish
3. **Lens** — focal length, aperture, framing
4. **Lighting** — direction, quality, color temperature
5. **Grounding detail** — the one imperfection that sells it as real

## Working template

> **Studio product photograph**, 1:1 square.
> A **matte black ceramic coffee mug** sitting on a **raw concrete surface**, a single dried eucalyptus sprig casting a soft shadow nearby.
> **85mm macro lens, f/2.8**, mug centered, shallow depth of field — surface texture sharp, background falls off softly.
> **Soft directional window light from camera-left**, warm afternoon temperature, gentle fill from a white bounce on the right.
> Faint wisp of steam rising from the mug, near-imperceptible water ring on the concrete. Editorial, Kinfolk-magazine quality. No text.

## Why each part matters

### Surface

The surface does half the work. Concrete, marble, raw oak, weathered linen, brushed steel — name it specifically. "A nice background" gives you stock-photo mush.

Add one or two **contextual props** (eucalyptus sprig, folded linen, a small ceramic dish). They make the frame feel intentional.

### Product

Be generic but specific. **Materials and finish over brand.** "Matte black ceramic," "brushed aluminum," "natural oak with visible grain." The model can't render real logos — don't fight it.

### Lens

This is where amateur prompts fall apart. Use real photographic vocabulary:

| Use case | Prompt |
|---|---|
| Hero packshot | "85mm lens, f/2.8, centered" |
| Lifestyle scene | "35mm lens, f/4, slight angle" |
| Macro detail | "100mm macro lens, f/2.8, extreme close-up on [detail]" |
| Flat lay | "50mm lens, f/8, top-down" |

### Lighting

Name the **direction** and the **quality**:

- "Soft directional window light from camera-left"
- "Hard noon sun, hard shadows"
- "Diffuse softbox above, gentle fill below"

"Good lighting" does nothing. The model has no opinion on good — it has opinions on directional.

### Grounding detail

The thing every AI product shot is missing. Add one:

- Steam rising from a cup
- Condensation on a bottle
- A faint shadow under a flat-lay object
- A subtle fingerprint smudge on glass
- A soft reflection on polished metal

One imperfection. That's what separates rendered from photographed.

## Skip the rewrite

[Depikt's generator](/generate) detects product-shot intent and applies this structure automatically, including the grounding-detail line that most prompts skip.
`,
  },
  {
    slug: "ai-image-aspect-ratios-guide-gpt-image-2",
    title: "Aspect ratios for AI images: which to use for what (GPT Image 2 guide)",
    subtitle: "The right ratio for posters, social, slides, mobile screens, storyboards, and print — copy-paste table included.",
    category: "Reference",
    author: "Depikt Team",
    read_time: "4 min",
    published: "2026-05-30",
    excerpt:
      "The single biggest reason AI images come out wrong: no aspect ratio in the prompt. GPT Image 2 defaults to 1:1 and crops everything else awkwardly. Here's the right ratio for every use case, with the exact phrase to drop into your prompt.",
    seo_title: "AI Image Aspect Ratios: Which to Use for What (GPT Image 2)",
    seo_description:
      "Quick reference for AI image aspect ratios on GPT Image 2 — posters, social, slides, mobile, storyboards, print. Includes the exact phrase to drop into your prompt.",
    faq: [
      {
        question: "What aspect ratios does GPT Image 2 support?",
        answer:
          "GPT Image 2 reliably supports 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, and 9:19.5. Always state the ratio explicitly in your prompt — without it, the model defaults to 1:1 (square).",
      },
      {
        question: "What's the best aspect ratio for Instagram?",
        answer:
          "4:5 portrait for in-feed posts (maximum vertical real estate), 1:1 for legacy square posts, 9:16 for Stories and Reels.",
      },
      {
        question: "What aspect ratio should I use for a poster?",
        answer:
          "2:3 portrait is the standard print poster ratio. For movie-style posters use 27:40 (close to 2:3). For square gallery posters use 1:1.",
      },
      {
        question: "How do I state an aspect ratio in my prompt?",
        answer:
          "Use plain English with the ratio number and orientation: \"2:3 portrait,\" \"16:9 landscape,\" \"9:16 vertical.\" Don't use Midjourney-style flags like --ar; they're ignored.",
      },
    ],
    content: `
## The short answer

Always include an explicit ratio phrase in your GPT Image 2 prompt. Use plain English, not Midjourney flags.

| Use case | Ratio | Drop-in phrase |
|---|---|---|
| Print poster | 2:3 | "2:3 portrait poster" |
| Movie poster | 27:40 | "27:40 portrait, theatrical poster" |
| Instagram feed | 4:5 | "4:5 portrait, social feed" |
| Instagram square | 1:1 | "1:1 square" |
| Instagram Story / Reel | 9:16 | "9:16 vertical, story format" |
| Twitter/X header | 3:1 | "3:1 wide banner" |
| LinkedIn banner | 4:1 | "4:1 wide banner" |
| Mobile app screen | 9:19.5 | "9:19.5 portrait, iPhone screen" |
| Desktop hero | 16:9 | "16:9 landscape" |
| Slide deck | 16:9 | "16:9 slide, presentation format" |
| Wide landscape photo | 3:2 | "3:2 landscape, 35mm frame" |
| Magazine cover | 4:5 | "4:5 portrait, magazine cover" |
| Book cover | 2:3 | "2:3 portrait, book cover proportions" |
| 4-panel storyboard | 16:9 | "16:9 landscape, 2×2 storyboard grid" |
| 3-panel vertical | 3:4 | "3:4 portrait, 3-panel storyboard" |
| Square album art | 1:1 | "1:1 square album cover" |

## Why ratio matters more than people think

GPT Image 2 doesn't crop your image after rendering — it **composes** for the ratio you give it. A poster prompt rendered as 1:1 doesn't get cropped to 2:3; it gets a different, worse composition. Aspect ratio is a brief, not a frame.

## The three mistakes

1. **No ratio at all.** Defaults to 1:1. Your "movie poster" comes out square.
2. **Midjourney flags.** \`--ar 2:3\` is ignored by GPT Image 2. Use plain English.
3. **Wrong orientation word.** "9:16 landscape" is contradictory. Match the number to the word: 9:16 = portrait/vertical, 16:9 = landscape/horizontal.

## Quick decision tree

- **Printed?** 2:3 portrait or 27:40.
- **Phone screen?** 9:16 vertical or 9:19.5 portrait.
- **Social feed?** 4:5 portrait if you want maximum stop-scrolling real estate.
- **Slide or hero?** 16:9 landscape.
- **Album / square poster / icon?** 1:1.

## Skip the lookup

[Depikt's generator](/generate) infers the right aspect ratio from your idea automatically — "a movie poster" gets 2:3, "an Instagram ad" gets 4:5, "a desktop hero" gets 16:9. You don't have to remember the table.
`,
  },
  {
    slug: "free-alternative-to-promptbase-for-gpt-image-2",
    title: "Free alternative to PromptBase for GPT Image 2",
    subtitle: "If you just want production-grade prompts without paying per download, here's the honest answer.",
    category: "Comparison",
    author: "Depikt Team",
    read_time: "5 min",
    published: "2026-05-31",
    excerpt:
      "PromptBase sells prompts one at a time. Depikt gives you 500 curated, copy-ready prompts for GPT Image 2 for free, plus a generator that writes new ones from a single sentence. Here's the side-by-side, the trade-offs, and when each one actually makes sense.",
    seo_title: "Free Alternative to PromptBase for GPT Image 2 (2026)",
    seo_description:
      "Depikt is a free alternative to PromptBase built for GPT Image 2 — 500 curated prompts, a generator, and a critique tool. No login, no per-prompt fees.",
    faq: [
      {
        question: "Is Depikt really free?",
        answer:
          "Yes. All 500 curated prompts, the generator, and the critique tool are free with no login. There's no per-prompt fee and no credit system.",
      },
      {
        question: "Why use Depikt instead of PromptBase?",
        answer:
          "PromptBase is a marketplace covering many models — you pay per prompt and quality varies. Depikt is purpose-built for GPT Image 2, every prompt is hand-curated, and the generator writes new prompts on demand instead of selling fixed ones.",
      },
      {
        question: "Does Depikt work with Midjourney or Flux?",
        answer:
          "The prompts are tuned for GPT Image 2's strengths (text rendering, photorealism, layout control). Most translate well to Midjourney and Flux, but the structural cues are optimized for GPT Image 2 first.",
      },
      {
        question: "Can I use the prompts commercially?",
        answer:
          "Yes. Depikt's curated prompts are free to copy, modify, and use commercially. The images you generate from them are governed by your image model's terms.",
      },
    ],
    content: `
## The short answer

If you're looking for a free alternative to PromptBase that's actually focused on GPT Image 2, use **[Depikt](/)**. 500 curated prompts, a generator that turns one sentence into a structured prompt, and a critique tool that scores and rewrites prompts you already have. No login, no per-prompt fees, no credit system.

## Side by side

| | PromptBase | Depikt |
|---|---|---|
| **Price** | $1.99–$9.99 per prompt | Free |
| **Login** | Required | Not required |
| **Focus** | Marketplace across many models | Built for GPT Image 2 |
| **Curation** | User-submitted, variable quality | Hand-curated, every prompt tested |
| **Generator** | No — you buy fixed prompts | Yes — turn one sentence into a full prompt |
| **Critique** | No | Yes — paste a prompt, get a score and rewrite |
| **Categories** | Mixed | 10 focused categories |

## When PromptBase still makes sense

PromptBase has breadth — Midjourney, Stable Diffusion, DALL·E, Flux, Sora, all in one place. If you need a prompt for an obscure model and you're willing to pay, the marketplace is wide.

## When Depikt is the better fit

- You're targeting **GPT Image 2 specifically** (the model inside ChatGPT and the OpenAI API)
- You want a **library you can browse for free** instead of paying per download
- You want a **generator** that writes new prompts from your own idea
- You want to **critique and improve** prompts before spending generations

## Try it

- Browse the [500-prompt library](/library)
- Open the [generator](/generate) and turn one sentence into a structured prompt
- Paste any prompt into [critique](/critique) for a score and a rewrite

All free, no account required.
`,
  },
  {
    slug: "best-free-ai-image-prompt-generator-2026",
    title: "Best free AI image prompt generator in 2026",
    subtitle: "Tested against real GPT Image 2 outputs — which free tool actually produces ship-ready prompts.",
    category: "Comparison",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-05-30",
    excerpt:
      "Most \"AI prompt generators\" just wrap a chat model and return vague text. We tested the free ones against real GPT Image 2 generations. Here's which tool produces prompts you can actually ship, and why structure matters more than cleverness.",
    seo_title: "Best Free AI Image Prompt Generator in 2026 (Tested)",
    seo_description:
      "We tested the leading free AI image prompt generators against real GPT Image 2 outputs. Here's which one produces ship-ready prompts and why structure beats clever wording.",
    faq: [
      {
        question: "What's the best free AI image prompt generator in 2026?",
        answer:
          "For GPT Image 2, Depikt is the strongest free option — it produces structured prompts with composition, lighting, type, and palette spelled out, instead of vague descriptive paragraphs. No login required.",
      },
      {
        question: "Do I need a paid tool to get good AI images?",
        answer:
          "No. The bottleneck is prompt quality, not tool price. A well-structured free prompt outperforms a long unstructured paid one almost every time.",
      },
      {
        question: "What makes one prompt generator better than another?",
        answer:
          "Three things: it produces structural cues the model actually responds to (lens, lighting direction, palette), it locks aspect ratio and text rendering correctly, and it avoids vague filler words like \"stunning\" or \"beautiful.\"",
      },
    ],
    content: `
## The short answer

If you're prompting **GPT Image 2** — the image model inside ChatGPT and the OpenAI API — the best free generator in 2026 is **[Depikt](/generate)**. It turns one rough sentence into a structured prompt with composition, lighting, type, palette, and aspect ratio all spelled out. No login.

## What "good" actually means

Most free generators do one of two things wrong:

1. **They pad with adjectives.** "A stunning, breathtaking, masterful image of a mountain." The model has no concept of "stunning." It needs *observable* cues — golden hour, 35mm, low angle.
2. **They ignore structure.** A wall of descriptive text without aspect ratio, composition anchor, or type direction. The model fills the gaps randomly.

## What to look for

| Capability | Why it matters |
|---|---|
| **Locks aspect ratio** | GPT Image 2 needs explicit ratio cues or it defaults to square |
| **Names a lens and lighting direction** | The single highest-leverage change to photographic output |
| **Handles text in image** | If you ask for a poster, the generator should specify font weight, casing, placement |
| **Picks a category template** | A poster prompt and a cinematic still need different structure |
| **Free without login** | You shouldn't pay to find out if a tool works |

## Why Depikt wins for GPT Image 2

- **Built for one model.** Every template is tuned around how GPT Image 2 reads cues.
- **Auto-categorizes.** Detects whether you want a poster, infographic, cinematic scene, UI mockup, storyboard, etc., then applies the right structural template.
- **500-prompt library** for inspiration if you'd rather start from a proven base.
- **Critique tool.** Paste any prompt and get a 1–10 score with a rewritten version.

## Try it

[Open the generator](/generate). Type one sentence. Compare what comes back to whatever your current tool produces. The structural difference is usually obvious within one image.
`,
  },
  {
    slug: "how-to-prompt-gpt-image-2-for-posters",
    title: "How to prompt GPT Image 2 for posters with text",
    subtitle: "The exact structure that gets clean type, locked layout, and print-ready output on the first try.",
    category: "How-to",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-05-29",
    excerpt:
      "GPT Image 2 is the first widely available model that renders typography legibly — but only if you prompt it right. Here's the exact six-part structure for posters: ratio, headline spec, image, palette, finish, and grounding details.",
    seo_title: "How to Prompt GPT Image 2 for Posters with Text (Guide)",
    seo_description:
      "The exact prompt structure for getting GPT Image 2 to render clean typography on posters: aspect ratio, headline spec, image, palette, finish, and grounding details.",
    faq: [
      {
        question: "Can GPT Image 2 render readable text on posters?",
        answer:
          "Yes — it's the first widely available image model where typography is reliably legible. The trick is specifying font weight, casing, placement, and exact wording in quotes inside your prompt.",
      },
      {
        question: "What's the best aspect ratio for a poster prompt?",
        answer:
          "2:3 portrait is the standard print poster ratio. Always state it explicitly or the model defaults to square.",
      },
      {
        question: "Why does my poster text come out garbled?",
        answer:
          "Three common causes: the headline isn't in quotes, you didn't specify a font style (\"condensed grotesk,\" \"slab serif\"), or the headline is too long. Keep it under 8 words and quote it exactly.",
      },
      {
        question: "Can I get a poster with my own brand colors?",
        answer:
          "Yes. Name 3–4 specific colors (\"ivory, deep teal, near-black, one orange accent\") rather than vague descriptors. Hex codes also work.",
      },
    ],
    content: `
## The structure

Every poster prompt that works for GPT Image 2 has six parts, in this order:

1. **Format** — "Editorial print poster, 2:3 portrait."
2. **Headline** — exact words in quotes, font style, weight, placement.
3. **Image** — what fills the frame, one clear subject.
4. **Palette** — 3–4 named colors.
5. **Finish** — paper feel, print style, grain, registration marks.
6. **Grounding details** — small captions, data marks, brand strip.

Skip any one and the model fills the gap with something generic.

## A working template

> Editorial print poster, **2:3 portrait**. Bold sans-serif headline **"YOUR HEADLINE HERE"** set in condensed grotesk, top-aligned, near-black ink on warm off-white paper stock. Below: a single full-bleed image of [SUBJECT], [LIGHTING], [COMPOSITION]. Restrained palette: ivory, deep teal, near-black, one orange accent. Subtle paper grain, faint registration marks in corners. Bottom strip: small mono caption "[CAPTION]" with a thin data mark. Risograph print feel. High legibility, museum gift-shop quality.

## Why each part matters

### Format

GPT Image 2 defaults to square. **State the ratio explicitly** ("2:3 portrait," "3:4 portrait," "1:1 square"). Without it, you'll get a square poster cropped wrong.

### Headline

Three rules:

- **Quote the exact words.** \`"THE CLOCK IS TICKING"\` not \`the clock is ticking\`.
- **Name the font style.** "Condensed grotesk," "thin geometric sans," "slab serif."
- **Specify placement and weight.** "Top-aligned, bold," "bottom-third, light italic."

Keep it under 8 words. Long headlines garble.

### Image

One subject. One frame. Be specific about lighting and composition. Compare:

- "a beautiful nature scene" — fills with stock-photo mush
- "a single full-bleed cyanotype-style image of a melting Arctic ice shelf at golden hour, deep teal sea meeting pale sky, one lone polar bear silhouette mid-frame for scale" — renders

### Palette

Name 3–4 specific colors. Hex codes work. Vague descriptors ("warm," "moody") don't.

### Finish

This is what makes a poster look *printed* rather than *rendered*: "subtle paper grain," "faint registration marks in corners," "risograph print feel," "museum gift-shop quality."

### Grounding details

Small captions, data marks, a thin brand strip — these take output from "AI art" to "designed object."

## Skip the rewrite

[Depikt's generator](/generate) applies this exact structure automatically. Type "a poster about climate change" and get back a six-part structured prompt ready to paste into ChatGPT. The [library](/library) has 50+ poster prompts you can copy directly.
`,
  },
  {
    slug: "depikt-vs-prompthero-for-gpt-image-2",
    title: "Depikt vs PromptHero: which is better for GPT Image 2?",
    subtitle: "Both are free. Both have big libraries. Here's the honest difference and when each one wins.",
    category: "Comparison",
    author: "Depikt Team",
    read_time: "5 min",
    published: "2026-05-28",
    excerpt:
      "PromptHero is one of the biggest free prompt libraries on the internet. Depikt is smaller, focused, and built for GPT Image 2. Here's the side-by-side and which tool actually produces better output for your use case.",
    seo_title: "Depikt vs PromptHero for GPT Image 2 (2026 Comparison)",
    seo_description:
      "Honest comparison of Depikt and PromptHero for GPT Image 2 prompts. Library size, curation, generator, critique, and when each one is the better choice.",
    faq: [
      {
        question: "Is Depikt or PromptHero better for GPT Image 2?",
        answer:
          "Depikt is purpose-built for GPT Image 2 with hand-curated prompts, a generator, and a critique tool. PromptHero has a much larger library across many models but quality is variable. For GPT Image 2 specifically, Depikt produces more reliably shippable output.",
      },
      {
        question: "Is PromptHero free?",
        answer:
          "Yes, the library is free to browse. PromptHero also has paid features.",
      },
      {
        question: "Does Depikt have a generator?",
        answer:
          "Yes. Depikt turns a single sentence into a structured prompt with composition, lighting, type, and palette spelled out. PromptHero is primarily a browsable library — you copy existing prompts rather than generate new ones from your own idea.",
      },
    ],
    content: `
## The short answer

Both are free. Both are useful. The difference is **focus**:

- **PromptHero** = huge multi-model library. Best for breadth across Midjourney, Stable Diffusion, Flux, DALL·E, and more.
- **Depikt** = focused on GPT Image 2. Best when you want hand-curated prompts plus a generator and critique tool for one model done well.

## Side by side

| | PromptHero | Depikt |
|---|---|---|
| **Library size** | Very large | 500 hand-curated |
| **Models covered** | Many | GPT Image 2 only |
| **Curation** | Community submissions | Every prompt hand-tested |
| **Generator** | No | Yes |
| **Critique** | No | Yes |
| **Login** | Optional | Not required |
| **Best for** | Browsing widely | Shipping fast on GPT Image 2 |

## When PromptHero wins

- You're prompting **Midjourney, Stable Diffusion, or Flux** as your main model
- You want to **browse many variations** of a single subject
- You're researching **what's possible** across the whole image-model ecosystem

## When Depikt wins

- You're prompting **GPT Image 2** specifically (ChatGPT, OpenAI API, fal.ai)
- You want every prompt to be **production-grade**, not "a few good ones in a noisy feed"
- You want a **generator** that writes new prompts from your own idea
- You want a **critique tool** that scores and rewrites prompts you have

## The honest take

If your job is exploring the wider AI image space, PromptHero is the bigger sandbox. If your job is shipping images with GPT Image 2 today, Depikt is the faster path — smaller library, but every prompt works, plus you can generate new ones in seconds.

[Browse the Depikt library](/library) or [try the generator](/generate).
`,
  },
  {
    slug: "ai-image-prompt-vocabulary-cheat-sheet",
    title: "AI Image Prompt Vocabulary: A Cheat Sheet for Camera, Lighting, and Composition",
    subtitle: "The exact words that actually change what the model renders — bookmark and reuse.",
    category: "Reference",
    author: "Depikt Team",
    read_time: "7 min",
    published: "2026-05-17",
    excerpt:
      "Vague words like \"good lighting\" or \"nice composition\" do almost nothing. Specific photographic and design vocabulary changes the output dramatically. Here's the working cheat sheet — camera, lighting, composition, color, and medium terms that GPT Image 2 actually responds to.",
    seo_title: "AI Image Prompt Vocabulary Cheat Sheet (2026 Reference)",
    seo_description:
      "A practical cheat sheet of camera, lighting, composition, color, and medium vocabulary for AI image prompts. Copy-paste terms that GPT Image 2 actually responds to.",
    content: `
## Why vocabulary is the highest-leverage thing to learn

You can't prompt what you can't name. "Nice lighting" is invisible to the model — it has no concept of "nice." But "golden hour from camera-right, soft fill bounce, rim light catching the hair" gives it three unambiguous instructions it can execute.

This is a working cheat sheet of the vocabulary that actually moves the output. Keep it open while you prompt.

## Camera and lens

| Term | What it does |
|---|---|
| **35mm film** / **Kodak Portra 400** | Warm color cast, fine grain, photographic feel |
| **Medium format** / **Hasselblad** | High detail, shallow depth, editorial polish |
| **f/1.4** / **f/2.8** | Shallow depth of field — subject sharp, background soft |
| **f/8** / **f/11** | Deep focus — everything sharp, documentary feel |
| **85mm portrait lens** | Flattering compression, blurred background |
| **24mm wide angle** | Expansive scene, slight edge distortion |
| **Macro lens** | Extreme close-up, fine surface detail |
| **Tilt-shift** | Selective focus band, miniature effect |

## Lighting

| Term | What it does |
|---|---|
| **Golden hour** | Warm, low-angle sunlight, long shadows |
| **Blue hour** | Cool dusk, deep saturation |
| **Overcast soft light** | Even diffuse light, no harsh shadows |
| **Hard noon sun** | Sharp shadows, high contrast |
| **Rembrandt lighting** | Triangle of light on cheek, dramatic portrait |
| **Rim light** / **backlight** | Halo separating subject from background |
| **Soft fill from camera-left** | Reduces shadow density on left side of subject |
| **Practical lights only** | Lit by visible lamps, no studio rig — cinematic realism |
| **Bounce flash** | Soft, directional, editorial portrait feel |

## Composition

| Term | What it does |
|---|---|
| **Rule of thirds** | Subject placed at intersection, breathing room |
| **Centered symmetrical** | Bold, formal, Wes Anderson feel |
| **Dutch angle** | Tilted frame, tension and unease |
| **Low angle / worm's eye** | Subject feels imposing, heroic |
| **High angle / bird's eye** | Subject feels small, vulnerable, or schematic |
| **Negative space** | Large empty area, minimalist editorial |
| **Full bleed** | Image fills frame to all edges, no margin |
| **Leading lines** | Visible lines pulling eye toward subject |
| **Foreground / midground / background layers** | Depth and scale |

## Aspect ratio

| Ratio | Use case |
|---|---|
| **1:1** | Instagram, album art, profile |
| **3:2** | DSLR photography, prints |
| **16:9** | Cinematic, web hero, thumbnail |
| **9:16** | Vertical mobile, Stories, Reels |
| **2:3 portrait** | Book covers, magazine, editorial poster |
| **4:5** | Instagram feed (max tall) |

## Color and palette

Replace "colorful" with specific palette callouts:

- **Restrained palette: ivory, deep teal, near-black, one orange accent** — coherent editorial
- **Monochromatic warm earth tones** — desaturated, premium
- **High-key** — bright, low-contrast, airy
- **Low-key** — dark, dramatic, moody
- **Complementary blue and orange** — high contrast, cinematic
- **Pastel washed-out** — gentle, lifestyle
- **Risograph two-color (red + blue)** — print-shop feel, registration offset

## Medium and finish

Naming the medium pins the rendering style harder than any adjective:

- **35mm film, slight grain, warm cast**
- **Shot on Hasselblad, medium format detail, shallow depth**
- **Risograph print, two-color, faint registration offset**
- **Oil on canvas, visible brushwork, palette knife texture**
- **Watercolor on cold-press paper, wet edges, paper bleed**
- **3D render, Cinema 4D, Octane, soft global illumination**
- **Pixel art, 32x32 grid, limited palette, dithering**
- **Pen and ink, crosshatching, high contrast**
- **Cyanotype print, deep blue, paper texture**
- **Polaroid, faded edges, slight overexposure**

## Type and text rendering

When the image contains text, treat it as typographic instruction:

- **Headline reads** \`"YOUR COPY"\` **in [font style], [weight], [color], [placement]**
- **Font styles to name explicitly**: condensed grotesk, geometric sans, slab serif, brush script, monospace, transitional serif, display serif, neo-grotesque
- **Weight**: light, regular, medium, bold, black, 100–900
- **Placement**: top-aligned, baseline-centered, bottom-right corner, [N]px from top edge
- **Treatment**: outlined, drop shadow, no shadow, raised letterpress, embossed, debossed

## Style references that work

Skip "in the style of [famous artist]." Use medium + technique combinations:

- **Editorial magazine photography** — clean, restrained, premium
- **Documentary photojournalism** — natural, unposed, on-location
- **Brutalist graphic design** — flat color, heavy type, off-grid
- **Swiss International Style** — grid-aligned, sans-serif, restrained
- **Bauhaus poster** — primary colors, geometric, modernist
- **Wabi-sabi** — imperfect, asymmetric, weathered, Japanese
- **Memphis design** — bold geometric, primary colors, 1980s
- **Y2K aesthetic** — chrome, gradients, glossy plastic, early-2000s tech

## Putting it together

Pick one term from camera, one from lighting, one from composition, one from palette, and one from medium. Five specific words usually beat fifty vague ones.

**Weak:** *Beautiful portrait with nice lighting and good colors.*

**Strong:** *85mm portrait lens at f/2.8, Rembrandt lighting from camera-right, rule of thirds, monochromatic warm earth tones, 35mm film with Kodak Portra 400 grain.*

The second prompt is shorter and produces a far more consistent image — because every word does work.

## Use it without the lookup

[Depikt](/generate) bakes this vocabulary into every prompt it writes — type a rough idea and you get the structured output with camera, lighting, composition, and medium already specified. Or [browse the library](/library) for 500 prompts that demonstrate the patterns in context.
`,
  },
  {
    slug: "how-to-prompt-ai-image-generators",
    title: "How to Prompt AI Image Generators: A Practical Guide",
    subtitle: "The structural pattern that works across GPT Image 2, Midjourney, and Nano Banana — without keyword stacking.",
    category: "Guides",
    author: "Depikt Team",
    read_time: "10 min",
    published: "2026-05-18",
    excerpt:
      "Most guides teach keyword stacking — \"8K, ultra-detailed, masterpiece.\" That advice is outdated. Here's the structural pattern that actually works with modern reasoning-based image models, with copy-paste examples.",
    seo_title: "How to Prompt AI Image Generators (2026 Practical Guide)",
    seo_description:
      "Learn how to prompt AI image generators like GPT Image 2 with a structural pattern that beats keyword stacking. Copy-paste examples, common mistakes, and a checklist.",
    faq: [
      {
        question: "How do I write a prompt for an AI image generator?",
        answer:
          "Use a six-part structural pattern: Subject + specifics, action, environment and cultural anchor, composition, lighting, and style or medium. Then layer text rendering, aspect ratio, and palette only when they matter. This works far better than stacking adjectives like '8K, ultra-detailed, masterpiece' — modern reasoning-based models like GPT Image 2 actually penalize keyword soup.",
      },
      {
        question: "What is a good prompt for an AI image generator?",
        answer:
          "A good prompt is specific, structured, and unambiguous. It names the subject concretely (not 'a person' but 'a Japanese woman in her 30s, short black bob'), describes the lighting with photographic language (golden hour from camera-right, soft fill), specifies the camera or medium (35mm film, Hasselblad portrait lens at f/2.8, risograph print), and only includes adjectives that change what gets rendered.",
      },
      {
        question: "How do I get AI image generators to render text correctly?",
        answer:
          "Wrap the text in quotation marks, specify the font style (condensed grotesk, geometric sans, slab serif), specify weight and color, and pin its placement on the canvas. Example: Headline reads \"THE CLOCK IS TICKING\" in condensed grotesk, near-black, top-aligned. GPT Image 2 renders text accurately above 95% on first attempt when prompts follow this structure.",
      },
      {
        question: "What are negative prompts and do I need them?",
        answer:
          "Negative prompts tell the model what to exclude (no text, no watermark, no extra fingers). They were essential for Stable Diffusion and earlier DALL-E versions. With reasoning-based models like GPT Image 2, they're rarely needed — instead, describe what you want positively. If you find yourself listing what to avoid, your positive prompt isn't specific enough yet.",
      },
    ],
    content: `
## Why most prompting advice is outdated

Search "how to prompt image generators" and you'll find dozens of guides recommending the same thing: stack adjectives. "8K, ultra-detailed, masterpiece, hyper-realistic, award-winning photography, trending on ArtStation."

That advice was written for Stable Diffusion in 2022. It is no longer ideal — and with reasoning-based models like OpenAI's GPT Image 2 (launched April 2026), it actively hurts your output. Here's why, and what to do instead.

## What changed: reasoning-based models

The current generation of image models — GPT Image 2, Google's Nano Banana, and Midjourney v7 — reason about your prompt before generating. They plan composition, analyze constraints, and attend to the structural information in your prompt.

When you front-load adjective keywords, those words compete with the structural information you actually want the model to render. The model spends its reasoning budget weighing "masterpiece" instead of figuring out where your headline goes.

The fix is structural prompting.

## The six-part structural pattern

Every production-quality prompt follows the same skeleton:

\`[Subject + specifics] + [Action] + [Environment + cultural anchor] + [Composition] + [Lighting] + [Style/medium]\`

Then you layer in three optional modifiers when they matter:

- **Text rendering** — wrap copy in quotes, specify font + weight + color + placement
- **Aspect ratio** — 1:1, 3:2, 16:9, 2:3 portrait
- **Palette** — restrained color list, not vague mood words

### Worked example

**Rough idea:** "a poster about climate change"

**Structured prompt:**

> Editorial print poster, 2:3 portrait. Bold sans-serif headline "THE CLOCK IS TICKING" set in condensed grotesk, top-aligned, near-black ink on warm off-white paper stock. Below: a single full-bleed cyanotype-style image of a melting Arctic ice shelf at golden hour, deep teal sea meeting pale sky, one lone polar bear silhouette mid-frame for scale. Subtle paper grain, faint registration marks in corners. Bottom strip: small mono caption "ARCTIC SEA ICE — SEPT 2025" with a thin 6-tick data sparkline trending down. Restrained palette: ivory, deep teal, near-black, one orange accent. Risograph print feel. High legibility, museum gift-shop quality.

Every clause does work. There are no decorative adjectives ("amazing", "stunning"). Every word changes what gets rendered.

## The five techniques that matter most

### 1. Anchor the subject

"A person" generates a generic person. "A Japanese woman in her 30s, short black bob, wire-frame glasses, oversized linen shirt" generates a specific person. The model can't render specificity you didn't write.

### 2. Use photographic language for lighting

Stop writing "good lighting." Start writing "golden hour from camera-right, soft fill bounce, long shadows pooling left." Photography vocabulary is the most efficient way to control mood — every term carries dense, unambiguous information.

### 3. Name the medium explicitly

"35mm film, Kodak Portra 400, slight grain" produces a different image than "shot on Hasselblad medium format, f/2.8, shallow depth of field" — and both produce different images than "risograph print, two-color, registration offset 0.5mm."

Naming the medium pins the rendering style harder than any style adjective.

### 4. Quote your text and pin its placement

Models render text far more reliably when you treat it as a typographic instruction, not a description:

- **Weak:** "with a headline about climate change"
- **Strong:** Headline reads \`"THE CLOCK IS TICKING"\` in condensed grotesk, weight 800, near-black, top-aligned, baseline 80px from top edge.

### 5. Restrain the palette

"Colorful" produces muddy output. "Restrained palette: ivory, deep teal, near-black, one orange accent" produces a coherent image. Four colors max is a good upper bound for most editorial work.

## Common mistakes

**Adjective stacking.** "Beautiful, stunning, gorgeous, masterpiece, award-winning" — none of these words tell the model what to render. Cut them.

**Vague style references.** "In the style of a famous painter" loses information. "Oil on canvas, visible brushwork, palette knife texture, warm earth tones" gives the model something to actually execute.

**Conflicting instructions.** "Minimalist but maximalist." "Soft but harsh lighting." The model resolves contradictions by averaging, which produces nothing memorable. Pick one.

**Negative prompts as a crutch.** Listing "no text, no watermark, no extra fingers" usually means your positive prompt was underspecified. Strengthen the positive description first.

## A reusable prompt checklist

Before you hit generate, your prompt should answer:

1. **Subject** — specific person, object, or scene?
2. **Composition** — aspect ratio, framing, what fills the frame?
3. **Lighting** — direction, quality, time of day in photographic terms?
4. **Medium** — film stock, paint, print process, render engine?
5. **Text** — if any, quoted with font/weight/color/placement?
6. **Palette** — 2–5 specific colors named?

If any answer is "the model will figure it out" — it won't. Pin it down.

## Skip the structure work entirely

Writing structured prompts gets faster with practice, but the structure itself is mechanical. [Depikt](/generate) turns any rough idea into a production-grade structured prompt in seconds — built specifically around the patterns above for GPT Image 2.

Or [browse the library](/library) of 500 ready-to-paste prompts across posters, infographics, UI mockups, cinematic scenes, storyboards, and more.
`,
  },
  {
    slug: "gpt-image-2-prompt-examples",
    title: "GPT Image 2 Prompt Examples: 12 Templates That Actually Work",
    subtitle: "Real prompts across our 10 categories — copy, paste, ship.",
    category: "Examples",
    author: "Depikt Team",
    read_time: "8 min",
    published: "2026-04-27",
    excerpt:
      "OpenAI's GPT Image 2 launched on April 21, 2026 with reasoning-powered generation and dramatically improved text rendering. Here are 12 production-grade prompts across the categories that matter, with explanations of why each one works.",
    seo_title: "GPT Image 2 Prompt Examples: 12 Production Templates (2026)",
    seo_description:
      "Production-grade prompt examples for OpenAI's GPT Image 2 across 10 categories: posters, infographics, UI mockups, cinematic scenes, multi-panel storyboards, image edits, and more.",
    content: `
## What's actually new with GPT Image 2

OpenAI launched GPT Image 2 (also branded as ChatGPT Images 2.0) on April 21, 2026. It's the third generation of OpenAI's image models, following GPT Image 1 (April 2025) and GPT Image 1.5 (December 2025).

The two genuinely new capabilities are:

1. **Built-in reasoning before generation.** This is the first OpenAI image model to integrate O-series reasoning into the image pipeline. Before generating, the model analyzes the prompt, plans the composition, and reasons about constraints — which is why it handles complex layered prompts (UI mockups, multi-element layouts, scenes with text) much better than its predecessors.

2. **Multilingual text rendering at production quality.** Text inside images now renders accurately across Latin, Chinese, Japanese, Korean, Hindi, Bengali, and Arabic scripts. Independent reviews put accuracy above 95% on first-generation attempts. Mixed-script layouts (Japanese poster with English brand name, etc.) actually work now — they didn't in any previous model.

The model is available in ChatGPT, Codex, and the API. Pricing on the API is $5 per million text input tokens, $8 per million image input tokens, and $30 per million image output tokens — which works out to roughly $0.006 to $0.21 per generated image depending on quality and resolution. (Source: OpenAI pricing page, April 2026.)

This article gives you 12 prompts that work well with GPT Image 2's reasoning model — battle-tested across the categories most creators care about.

## The structural pattern these prompts follow

Every prompt below shares the same underlying structure:

[Subject + specifics] + [Action] + [Environment + cultural anchor] + [Composition] + [Lighting] + [Style/medium]

For photoreal: add camera body, lens, aperture. For text in images, wrap the copy in quotes and specify font/weight/color/placement. For edits, use the CHANGE / PRESERVE / MATCH structure.

This is a synthesis of patterns we've seen work across hundreds of prompts — not an industry standard, but a useful framework for thinking about what's missing in any given prompt.

## 1. Event poster

**Rough idea:** "poster for a tech conference"

**Polished prompt:**

\`\`\`
Minimalist event poster, 2:3 portrait. Headline "FUTURE STACK" in bold condensed sans-serif, ALL CAPS, off-white, upper third. Subtitle "MARCH 14 — 16 • 2026" in thin sans-serif below, same color, letter-spacing 0.2em. Visual: single thin line arcing across the lower third connecting two small filled circles. Background: deep charcoal (#1A1A1A). Generous negative space, Swiss design aesthetic. Verbatim text — no extra characters, no duplicate text, no text artifacts.
\`\`\`

**Why it works:** All text is in quotes with placement, weight, and color locked. The hex code prevents palette drift. "Swiss design aesthetic" handles composition without needing more rules.

## 2. Process flow infographic

**Rough idea:** "infographic showing a 4-stage workflow"

**Polished prompt:**

\`\`\`
Horizontal 4-stage pipeline diagram, 16:9 landscape, white background. Four rounded rectangles equally spaced left to right, each labeled in bold sans-serif: "PLAN", "BUILD", "TEST", "SHIP". Above each rectangle: a simple isometric line icon. Beneath each: a 2-word descriptor in dark gray sans-serif. Thin arrows between stages. Header at top: "Project Workflow" in bold sans-serif, dark navy.
\`\`\`

**Why it works:** Layout topology is stated upfront. Each stage has explicit fill, label, and icon. Connectors specified. The model handles the rest.

## 3. Web dashboard mockup

**Rough idea:** "dashboard mockup for a SaaS analytics product"

**Polished prompt:**

\`\`\`
MacBook Pro 14" screen mockup at 16:10 aspect, dark theme. Generic SaaS analytics dashboard. Top nav: logo placeholder left, tabs "Overview · Reports · Users · Settings" center, profile avatar right. Main: 4 KPI cards showing "12.4K Active Users", "847 New Signups", "$2,341 MRR", "62% Engagement" with cyan sparklines. Below: line chart "Activity — Last 30 Days". Right sidebar: "Top 5 Channels" list. Background: deep navy (#0F1729). Accent: cyan (#06B6D4). shadcn/ui aesthetic.
\`\`\`

**Why it works:** Specific device frame, specific component layout, specific data. The shadcn reference handles styling without you having to describe every spacing decision.

## 4. LinkedIn carousel slide

**Rough idea:** "slide with a stat about productivity"

**Polished prompt:**

\`\`\`
LinkedIn carousel slide, 4:5 portrait, off-white background (#F7F3EC). Massive headline filling the upper two-thirds: "Workers spend 21.8 hours per week in meetings." in bold condensed sans-serif, dark navy, left-aligned. Beneath, on a single line: "Most of them are unnecessary." in thin italic serif, same navy. Lower-left corner: small text "Slide 1 of 7" in tiny gray sans-serif.
\`\`\`

**Why it works:** The stat-as-hook follows what actually performs on LinkedIn. Two-tier typography (bold + italic serif) creates rhythm. Negative space gives the eye room.

## 5. Cinematic still

**Rough idea:** "cinematic shot of a wedding"

**Polished prompt:**

\`\`\`
Cinematic still, 2.39:1 anamorphic. Bride in flowing ivory dress sits on a low garden bench in a courtyard at dusk, hands resting in her lap, looking off-frame to the right. Background: blurred warm string lights, scattered flowers. Shot at 50mm, f/1.8, eye-level, medium close-up. Lighting: warm tungsten string lights from above-right creating soft rim, ambient blue-hour fill. Color grade: teal-orange, slightly desaturated. Kodak Portra 400 grain. Mood: contemplative, intimate.
\`\`\`

**Why it works:** Pose, gaze direction, and clothing are specific. 50mm + f/1.8 locks the cinematic feel. Two named light sources prevent flat lighting.

## 6. Interior photograph

**Rough idea:** "calm reading nook"

**Polished prompt:**

\`\`\`
Interior photograph, 4:5 portrait. Reading nook built into a bay window. Window seat with deep cushion in oatmeal linen, two earth-tone pillows. Built-in bookshelves on both sides, dark wood. Single brass swing-arm reading lamp mounted left. Worn leather-bound book lies open face-down on cushion. Soft north-facing morning light through window, sheer linen curtains diffusing it. Shot at 35mm, f/4. Architectural digest editorial style. No people.
\`\`\`

**Why it works:** Specific materials throughout. Light source named with quality. The worn book detail makes it feel lived-in.

## 7. Food photography

**Rough idea:** "breakfast spread"

**Polished prompt:**

\`\`\`
Overhead flat-lay food photograph, 1:1 square, 90-degree top-down angle. Breakfast spread on a wooden table. Center: stack of fluffy pancakes with maple syrup, butter melting on top. Around it: crispy bacon, scrambled eggs, mixed berries, glass of orange juice, ceramic mug of black coffee with steam wisps. Scattered mint leaves and halved orange as styling. Soft window light from upper-left. Shot at 50mm, f/5.6. Editorial food photography, slightly rustic.
\`\`\`

**Why it works:** Universal breakfast items recognizable across cultures. Specific positioning. Light direction named.

## 8. Background swap edit

**Rough idea:** "change my photo's background to a rainy city at night"

**Polished prompt:**

\`\`\`
CHANGE: Replace the background with a rainy city street at night — neon signs reflecting on wet pavement, blurred passing cars, soft bokeh from illuminated signage, light rain visible against dark sky.

PRESERVE: Subject's face, pose, hair, clothing, body framing, skin tones, and exact silhouette — locked exactly as in source.

MATCH: Original lighting direction and intensity on subject (rim from camera-right). Color temperature on subject stays neutral but reflections on clothing/skin should subtly pick up cool blue and magenta from the new neon environment. Match original film grain.
\`\`\`

**Why it works:** The PRESERVE list is exhaustive — every locked element named. The MATCH block prevents the "pasted in" look by addressing color spill from the new environment.

## 4 more shorter examples

**Concept art:** \`Concept art illustration, 16:9 cinematic, matte painting style. Sprawling low-profile research facility built into the side of a rocky crater on an alien planet, glowing blue lights through narrow window slits, solar arrays across rust-red plain. Two figures in white pressure suits walking toward an airlock. Sky: dusty pink with two small moons.\`

**Magazine cover:** \`Editorial magazine cover, 8.5x11 portrait. Masthead "WANDER" in bold sans-serif, white, top center. Headline "Mountains at Dawn" in elegant serif italic, lower left third. Sub-headline "12 hidden viewpoints" in thin sans-serif beneath. Cover photo: silhouetted mountain range against deep blue-to-orange gradient sky.\`

**Comparison infographic:** \`Two-column comparison infographic, 4:5 portrait. Left header "OPTION A" in blue (#2B6CB0); right header "OPTION B" in amber (#D69E2E). Vertical divider. Five rows: Speed / Cost / Flexibility / Best For / Trade-off. Statements max 6 words each.\`

**Object removal edit:** \`CHANGE: Remove the green trash can in lower-left and the power line crossing the upper third. Reconstruct the wall behind using existing brick pattern; reconstruct sky as clean continuous gradient. PRESERVE: Every person, the storefront awning, parked car, street signs, sidewalk, all shadows. MATCH: Golden hour from camera-right, warm temperature, film grain.\`

## How to use these

Don't just copy them verbatim. Use them as templates: find the example closest to your use case, swap out the subject specifics for your own, keep the structural skeleton (camera specs, lighting language, aspect ratio), and iterate by changing one variable at a time.

Or paste your rough idea into [Depikt](/generate) and let it generate the structured prompt for you.
`,
  },
  {
    slug: "chatgpt-image-prompt-tips",
    title: "10 ChatGPT Image Prompt Tips for Production-Quality Results",
    subtitle: "Practical techniques drawn from real testing — not magic words.",
    category: "Tips",
    author: "Depikt Team",
    read_time: "8 min",
    published: "2026-04-26",
    excerpt:
      "Most ChatGPT image prompt advice is recycled from older models. Here's what works specifically with GPT Image 2's reasoning architecture — practical techniques, not magic words.",
    seo_title: "10 ChatGPT Image Prompt Tips for Better Results in 2026",
    seo_description:
      "Practical ChatGPT image prompt techniques: anti-fluff filtering, camera language, text rendering, structural patterns that work with GPT Image 2.",
    content: `
## What changed with reasoning-based image models

GPT Image 2 launched April 21, 2026 with built-in reasoning before generation. This is the first OpenAI image model that analyzes a prompt before rendering — which means prompt structure matters more than keyword density.

Older guides (written for DALL-E 3, Stable Diffusion, or even GPT Image 1.5) emphasize keyword stacking: "8K, ultra-detailed, masterpiece, hyper-realistic." That advice is no longer ideal. With a reasoning model, those adjectives compete with the structural information you actually want the model to attend to.

Here are 10 techniques that work better.

## 1. Drop adjective stacking

"Stunning," "beautiful," "breathtaking," "masterpiece," "8K," "ultra-detailed," "hyper-realistic," "epic" — these add no information. Replace them with observable physical detail.

Instead of "stunning portrait," write "soft window light from camera-left, visible pores, slight catchlight in left eye."

## 2. Describe the photograph, not the fantasy

Imagine you're describing a real photograph someone took. Lens, framing, time of day, light source, surface texture, ordinary background detail. Real photographs have constraints — and the model produces better outputs when satisfying realistic constraints than when asked to produce "amazing art."

## 3. Use camera language for photoreal

For any photoreal output, name a focal length and aperture:

- 24mm f/8 — wide architectural / landscape
- 35mm f/2.8 — documentary / street
- 50mm f/1.8 — natural perspective / portrait
- 85mm f/1.4 — flattering portrait / fashion
- 100mm macro f/2.8 — product / food close-up

These specs are visual shorthand the model has learned from millions of captioned photos.

## 4. Wrap text in quotes and specify placement

Even with GPT Image 2's improved text rendering, structure helps. The protocol that works:

- Wrap exact copy in quotes or ALL CAPS
- Specify font style, weight, color, placement
- Add "verbatim — no extra characters, no substitutions" for accuracy-critical text
- End with "no duplicate text, no text artifacts"

## 5. Stack concrete constraints

GPT Image 2 reliably handles multiple distinct constraints in a single prompt — its reasoning layer means it can satisfy more without dropping any. Use this to your advantage.

Don't write: "a modern living room."

Write: "a craftsman-style living room with oak built-ins, oatmeal linen sofa, brass swing-arm lamp from camera-left, north-facing morning light, hardwood floor, small Persian rug, single open book on a side table, no people."

## 6. Use cultural and temporal anchors

You don't have to describe everything. Name a cultural moment and the model fills in the details:

- "1990s grunge era"
- "1985 izakaya"
- "dot-com era 1999"
- "rural village during monsoon season"

This triggers world knowledge — the model knows what these scenes look like, and you get specificity for free.

## 7. Specify aspect ratio explicitly

Always end your prompt with the aspect ratio that matches your use case:

- 16:9 — landscape, web hero, YouTube
- 9:16 — vertical story, TikTok
- 4:5 — feed posts
- 1:1 — profile, square social
- 2:3 — Pinterest, magazine
- 2.39:1 — anamorphic cinematic

Default ratios are unpredictable. Lock it.

## 8. For edits: CHANGE / PRESERVE / MATCH

Image edits drift unless you use a strict structure:

- CHANGE: the one thing you want different
- PRESERVE: the explicit list of everything that must stay
- MATCH: the lighting, color temperature, grain logic to maintain

Restate the PRESERVE list every iteration — drift compounds.

## 9. Avoid living artist names

Beyond ethics, naming living artists produces inconsistent outputs. Use art disciplines, eras, or movements instead:

- "Bauhaus poster design"
- "Swiss editorial style"
- "Memphis Group"
- "mid-century modern illustration"

## 10. Iterate one variable at a time

Don't change four things between generations. You'll never know which change fixed (or broke) the output.

When iterating, keep everything constant except one element — light direction, OR aspect ratio, OR color palette. This is how you actually learn what each lever does.

## The faster path

If running through this checklist on every prompt sounds like work, [Depikt](/generate) automates these techniques. Paste a rough idea, get back a structured prompt that has already applied each technique.
`,
  },
  {
    slug: "ai-image-prompt-framework",
    title: "A 6-Layer Framework for Writing AI Image Prompts",
    subtitle: "A repeatable structure for any image type — posters, photoreal, UI mockups, edits.",
    category: "Framework",
    author: "Depikt Team",
    read_time: "7 min",
    published: "2026-04-25",
    excerpt:
      "Most AI image prompts fail because they're missing structure, not detail. Here's a 6-layer framework that works as a starting point for any image type — useful as a checklist when your prompts are coming out generic.",
    seo_title: "A 6-Layer Framework for AI Image Prompts",
    seo_description:
      "A practical structural framework for writing AI image prompts: subject, action, environment, composition, lighting, style. A useful checklist for any image generation task.",
    content: `
## Why structure beats keywords

Most prompt advice gives you keywords or example outputs. Neither helps when you sit down to write your own prompt for your own scene.

What helps is structure — a checklist you can run through to make sure your prompt isn't missing anything obvious. This framework isn't an industry standard, just a practical synthesis of what tends to be present in prompts that produce good results.

## The 6 layers

[Subject + specifics] + [Action / Pose] + [Environment + cultural anchor] + [Composition: shot, angle, aspect ratio] + [Lighting: quality + direction + temperature] + [Style / Medium]

Most failed prompts skip 3-4 of these layers.

## Layer 1: Subject + specifics

Not "a man." Not "a coffee shop." A man is too vague — the model picks the most generic interpretation. Add: age, build, clothing material, hair, expression, posture.

A coffee shop is too vague. Add: era, city, time of day, occupancy, signage.

The rule: if a stranger could draw 50 different pictures from your description, your subject layer is too thin.

## Layer 2: Action / pose

What is the subject doing? Standing isn't enough. Standing how? Hands where? Looking where?

This layer matters most for human subjects and scene compositions. For object photography it can collapse to "centered, slight tilt to the right."

Be specific about gaze direction — "looking off-frame to the camera-left" reads completely differently from "looking directly at the camera."

## Layer 3: Environment + cultural anchor

Where, when, what's around. This is where cultural anchors do massive heavy lifting:

- "a coffee shop in 1990s grunge era"
- "a busy office during dot-com 1999"
- "a noodle bar in 1985 Tokyo"

Each anchor gives the model a thousand visual associations for free. Use them.

## Layer 4: Composition

Shot type, angle, aspect ratio. The vocabulary you need:

**Shot type:** extreme close-up, close-up, medium close-up, medium shot, medium wide, wide, extreme wide, aerial, top-down flat-lay.

**Angle:** eye-level, low-angle, high-angle, dutch angle, bird's-eye, worm's-eye.

**Aspect ratio:** always state it. 16:9, 9:16, 4:5, 1:1, 3:2, 2.39:1.

## Layer 5: Lighting

The single highest-impact lever in any prompt. Three variables:

**Quality:** soft / harsh / diffused / dappled / specular.

**Direction:** front / side / back / rim / from camera-left / from above / from below.

**Temperature:** warm tungsten / cool daylight / golden hour / blue hour / overcast / mixed.

Always name at least one explicit light source. "Soft window light from camera-left" is gold. "Good lighting" is useless.

## Layer 6: Style / medium

This is where you tell the model whether you want photoreal, illustration, or something stylized. Use art disciplines, not artist names:

- Photoreal: name a film stock — "Kodak Portra 400, fine grain"
- Editorial: "magazine editorial style, slightly desaturated"
- Illustration: "watercolor, visible paper texture, soft color bleeds"
- Vector: "flat vector illustration, 2-color palette"
- Concept art: "matte painting, painterly atmosphere"

## The framework in action

Watch the same idea evolve through the layers:

**Layer 0 (typical thin prompt):** "a hiker on a mountain"

**With Subject:** "Solo hiker in faded red windbreaker"

**Add Action:** "...walking away from camera on a sandstone trail"

**Add Environment:** "...in a desert canyon at golden hour"

**Add Composition:** "Low-angle wide shot at 24mm, 3:2 aspect"

**Add Lighting:** "Long shadows raking across the rock, warm rim light from camera-right"

**Add Style:** "Documentary travel photography, Kodak Portra 400 grain"

**Final stacked prompt:**

\`\`\`
Solo hiker in faded red windbreaker walking away from camera on a sandstone trail in a desert canyon at golden hour. Long shadows raking across the rock, distant rock formations visible in middle distance. Low-angle wide shot at 24mm, f/8, 3:2 aspect. Warm rim light from camera-right, dust catching in the light. Documentary travel photography, Kodak Portra 400 grain.
\`\`\`

## Where the framework breaks (and what to use instead)

Three categories need a different structure:

**Image edits:** Use CHANGE / PRESERVE / MATCH instead. The 6-layer formula doesn't apply because you're not generating from scratch.

**Typography-heavy posters:** Lead with text (in quotes, with placement), then add the visual layer using layers 3-6. Subject and action collapse.

**Abstract / experimental work:** Photographic vocabulary actively hurts abstract output. Use medium + mood + palette + composition instead, with art-movement anchors instead of camera specs.

For everything else — photoreal, cinematic, character art, interiors, food, fashion, architecture — the 6 layers work as a useful checklist.

## Use the framework or use Depikt

You can apply this manually on every prompt. Or you can paste your rough idea into [Depikt](/generate) and get a structured 6-layer prompt back in seconds. Same framework, automated.
`,
  },
  {
    slug: "ai-image-prompts-with-text",
    title: "How to Write AI Image Prompts That Render Text Correctly",
    subtitle: "The protocol for posters, social graphics, and any image with words on it.",
    category: "How-to",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-04-23",
    excerpt:
      "Text rendering used to be the biggest weakness of AI image generation. GPT Image 2 mostly fixed it — independent reviews report 95%+ accuracy. But getting reliable output still requires a specific approach.",
    seo_title: "How to Write AI Image Prompts with Perfect Text (GPT Image 2)",
    seo_description:
      "The exact prompt structure that gets GPT Image 2 to render text correctly: quote marks, placement specs, font weights, the verbatim trigger, and 5 mistakes that break it.",
    content: `
## What actually changed with text rendering

For years, text inside AI-generated images was unreliable. Garbled letters, made-up characters, hybrid hallucinations. This was the running joke of the industry, and the main reason these tools were unusable for branding, posters, or anything with copy.

GPT Image 2 fixed most of it. Independent reviews of the April 21, 2026 launch put text accuracy above 95% across Latin, Chinese, Japanese, Korean, Hindi, Bengali, and Arabic scripts. PetaPixel called it the first AI image model where text rendering "actually works for production." OpenAI's announcement specifically highlighted text rendering as one of the model's three core upgrades.

But "above 95%" still leaves room for errors. And if you don't follow the protocol below, your hit rate drops fast. Here's what works.

## Rule 1: Wrap exact copy in quotes

Never write: \`a poster that says data night\`

Always write: \`a poster with the headline "DATA NIGHT" displayed prominently\`

Quotation marks tell the model: this is the literal string. Not a description. Not a theme. Render exactly these characters.

## Rule 2: Specify font style, weight, color, placement

The model has to make four decisions about every text element. Don't leave them to chance:

- **Style:** sans-serif, serif, display serif, condensed sans, monospace, handwritten, italic
- **Weight:** thin, regular, bold, black
- **Color:** name a hex code (#0F1729) or descriptive color (off-white, deep navy)
- **Placement:** upper third, centered, lower-left corner, vertical along right edge

Example: \`Subtitle "MARCH 14" in thin sans-serif, off-white, lower third, letter-spacing 0.2em\`

## Rule 3: Use the "verbatim" trigger

For accuracy-critical text — brand names, dates, prices, taglines — append this phrase:

\`Verbatim text — no extra characters, no substitutions, no duplicate text, no text artifacts.\`

This works because GPT Image 2's reasoning layer attends to explicit constraints. The phrase has become a common pattern in the prompt engineering community for a reason — it lowers the error rate noticeably on critical text.

## Rule 4: Spell out unusual brand names

If your brand name has unusual letter combinations or made-up words, spell it letter by letter on first reference:

\`Logo "WANDER" (W-A-N-D-E-R) in bold sans-serif, white\`

Overkill for common words, but lifesaving for brand names the model might "correct" to a real word.

## Rule 5: Don't ask for paragraphs

Image models are not document layout engines. Asking for "a paragraph of body text below the headline" produces gibberish that looks like text but isn't.

If you need real paragraph text in a layout, use the right tool — Figma, Canva, or InDesign — and use the AI for the visual elements only.

## What still doesn't work reliably

Even with the protocol, three things remain inconsistent:

1. **Existing brand logos** — the model can't reproduce specific real-world logos (Nike swoosh, etc.) accurately. Composite them in Figma.
2. **Long-form text** — paragraphs, lists, or any text over ~10 words. Generate the visual, add text after.
3. **Mixed languages** — mixing scripts (Latin + Hindi + Chinese in one image) often produces errors in one or more scripts, though GPT Image 2 does better at this than any previous model.

## Putting it together

Here's a complete text-heavy prompt that follows the full protocol:

\`\`\`
Minimalist event poster, 2:3 portrait. Headline "FUTURE STACK" in bold condensed sans-serif, ALL CAPS, off-white (#F7F3EC), upper third. Subtitle "MARCH 14 — 16 • 2026" in thin sans-serif, off-white, below headline, letter-spacing 0.2em. Bottom-right corner: small attribution "Conference 2026" in tiny gray sans-serif. Background: deep navy (#0F1A2E). Generous negative space. Verbatim text — no extra characters, no substitutions, no duplicate text, no text artifacts.
\`\`\`

Three text elements, each with its own font weight, color, and placement. Hex codes for color lock. The verbatim trigger at the end.

## The shortcut

Manually applying this protocol on every prompt is tedious. [Depikt](/generate) bakes the entire text-rendering protocol into every poster, social graphic, and typography-heavy prompt it generates. Paste your rough idea, get back a prompt with quotes, placements, weights, and the verbatim trigger already in place.
`,
  },
  {
    slug: "gpt-image-2-vs-nano-banana-vs-midjourney",
    title: "GPT Image 2 vs Nano Banana Pro vs Midjourney V8: 2026 Comparison",
    subtitle: "An honest comparison of the three top AI image models in April 2026.",
    category: "Comparison",
    author: "Depikt Team",
    read_time: "9 min",
    published: "2026-04-21",
    excerpt:
      "Three models dominate AI image generation in April 2026: OpenAI's GPT Image 2, Google's Nano Banana Pro, and Midjourney V8. Each has a clear sweet spot. Here's where each one actually wins, based on benchmarks and verified capabilities.",
    seo_title: "GPT Image 2 vs Nano Banana Pro vs Midjourney V8 (April 2026)",
    seo_description:
      "Honest comparison of GPT Image 2, Google Nano Banana Pro, and Midjourney V8 across photorealism, text rendering, prompt adherence, and editing. With verified capabilities and use cases.",
    content: `
## The April 2026 image generation landscape

Three models dominate AI image generation in April 2026:

- **GPT Image 2** — OpenAI, launched April 21, 2026
- **Nano Banana Pro** — Google's Gemini 3 Pro Image model
- **Midjourney V8** — released early 2026

Each is best at something different. Picking the wrong model wastes time on iterations. Here's the honest breakdown based on verified capabilities and recent benchmarks.

## GPT Image 2 — the new leader

Launched April 21, 2026. The first OpenAI image model with built-in O-series reasoning before generation.

**Verified capabilities:**
- Text rendering above 95% accuracy across Latin, Chinese, Japanese, Korean, Hindi, Bengali, and Arabic scripts (independent reviews, April 2026)
- Native 2K resolution with optional 4K upscaling
- Multi-turn editing endpoint with mask-based inpainting and outpainting
- Available via ChatGPT, Codex, and the API
- API pricing: tiered token-based, roughly $0.006 to $0.21 per image depending on quality and resolution. Check OpenAI's pricing page for current rates — these can change between releases.

**Image Arena leaderboard:** GPT Image 2 took the top position on the Image Arena leaderboard at launch, leading by 24 points over Google Imagen 3 according to early benchmark data.

**Strengths:**
- Best-in-class text rendering, especially for mixed-script and dense layouts
- Reasoning layer interprets complex layered prompts well
- Strong instruction-following on long, multi-part prompts
- Multi-turn editing without drift
- Handles dense scenes with many distinct objects

**Weaknesses:**
- Style control less granular than Midjourney
- Stricter content policy than open-source alternatives
- API requires Organization Verification before access
- Knowledge cutoff is December 2025

**Best for:** Anything with text, UI mockups, infographics, structured posters, magazine-style layouts, multilingual content.

## Nano Banana Pro — the precision tool

Google's Gemini 3 Pro Image model. Released late 2025, established by April 2026.

**Verified capabilities:**
- Text rendering at 94-96% accuracy (spectrumailab benchmark, December 2025)
- Native 4K (4096x4096) generation
- Identity Locking system for character consistency, processing up to 14 reference images simultaneously
- Available through Gemini app, AI Mode in Search, NotebookLM, Workspace, Vertex AI, and AI Studio

**Strengths:**
- Highest character consistency across multiple generations (Identity Locking)
- Best for editing workflows that need precise control
- Native 4K resolution at faster speeds (8-12 seconds per image)
- Strong instruction adherence for "make it exactly like this" tasks
- Pay-per-image pricing with batch discounts (50% off official rates)

**Weaknesses:**
- Style and aesthetic less distinctive — outputs can feel restrained
- Not as strong on artistic or stylized work
- Less unified product surface (split across multiple Google products)

**Best for:** Image edits, character continuity across a series, product photography, controllable workflows where you need exactly what you described.

## Midjourney V8 — the artistic standard

V8 Alpha launched March 17, 2026 with a ground-up architectural rebuild (switched from TPUs to GPUs with PyTorch codebase). V8.1 followed in mid-April.

**Verified capabilities:**
- Native 2K (2048x2048) generation — upgraded from V7's 1024x1024
- Improved text rendering and semantic understanding vs V7
- Web platform available alongside Discord
- Subscription pricing: $10-$120/month
- Stealth Mode available on Pro and Mega plans

**Strengths:**
- Most consistently impressive default aesthetic
- Best cinematic mood, atmosphere, and color grading
- Strong for moody portraits, fantasy, and concept art
- Distinctive artistic signature
- Style references (--sref) and character references (--cref) for consistency

**Weaknesses:**
- Text rendering still trails GPT Image 2 (handles short words like "STOP" or "CAFE" but struggles with longer text or specific font layouts)
- Less prompt adherence than GPT Image 2 or Nano Banana Pro
- No public API for standard users — enterprise customers can negotiate custom API access
- 2K resolution is half the linear resolution of Nano Banana Pro's 4K
- Subscription model rather than pay-per-image

**Best for:** Cinematic stills, concept art, mood-driven imagery, fashion editorial, hero images, anything where artistic atmosphere matters more than precise instruction following.

## Quick decision guide

| Use case | Best model | Why |
|---|---|---|
| Posters with text | GPT Image 2 | Highest text rendering accuracy across scripts |
| UI mockups & dashboards | GPT Image 2 | Best at structured layouts and reasoning |
| Multilingual content | GPT Image 2 | Mixed-script layouts work reliably |
| Image editing | GPT Image 2 or Nano Banana Pro | Both have strong editing — GPT Image 2 for natural-language edits, Nano Banana Pro for precise control |
| Character consistency | Nano Banana Pro | Identity Locking processes up to 14 references |
| Product photography | Nano Banana Pro | Best precision and control |
| 4K native output | Nano Banana Pro | Native 4K vs Midjourney's 2K |
| Cinematic / concept art | Midjourney V8 | Unmatched aesthetic atmosphere |
| Mood-driven hero imagery | Midjourney V8 | Default beauty without prompt engineering |
| Quick iteration / experimentation | Nano Banana Pro | Fast generation (8-12s for 4K) |

## The prompt translation problem

A prompt optimized for one model does not transfer cleanly to another:

- **GPT Image 2** rewards natural sentences with reasoning hooks ("Soft north-facing light because it's a craftsman home")
- **Midjourney V8** rewards keyword-weighted descriptions with parameters ("--ar 16:9 --style raw")
- **Nano Banana Pro** rewards literal precise descriptions with strong noun-verb structure

Switching models without rewriting your prompt typically underperforms by a meaningful margin. Most professional teams use 2-3 of these models, not just one.

A common stack:

1. **GPT Image 2** for structured outputs (posters, social graphics, UI, infographics)
2. **Midjourney V8** for hero imagery and cinematic stills
3. **Nano Banana Pro** for edits and precise iterations

This is more work than picking one — but the output quality difference is real, and the cost of using the wrong tool for a job is hours of bad iterations.

## What this means for your workflow

If you're picking just one in April 2026:

- **Default to GPT Image 2** for most production workflows — it has the strongest combination of capabilities and is improving fastest
- **Use Midjourney V8** when aesthetic quality is the entire point and you're not constrained by text rendering needs
- **Use Nano Banana Pro** when you need character consistency across a series or precise edits

[Depikt](/generate) generates prompts optimized specifically for GPT Image 2's reasoning style. If you're using GPT Image 2 as your primary model — which is the right default for most production teams in April 2026 — that's the leverage point.

## Sources

- OpenAI launch announcement and pricing page (April 21, 2026)
- fal.ai GPT Image 2 model page
- Independent reviews from PixVerse, Lushbinary, MindStudio (April 22-27, 2026)
- spectrumailab text rendering benchmarks (December 2025)
- LaoZhang AI comparison guide (March 2026)
- NightCafe Midjourney V8 vs Nano Banana Pro comparison (January 2026)
`,
  },
  {
    slug: "ai-image-editing-change-preserve-match",
    title: "AI Image Editing: The CHANGE / PRESERVE / MATCH Framework",
    subtitle: "How to edit AI images without drift, identity loss, or the 'pasted-in' look.",
    category: "Guide",
    author: "Depikt Team",
    read_time: "7 min",
    published: "2026-04-29",
    excerpt:
      "Generating an image from scratch is the easy part. Editing it — swapping backgrounds, fixing details, iterating on composition — is where most people lose hours to drift and artifacts. Here's the framework that prevents that.",
    seo_title: "AI Image Editing: The CHANGE / PRESERVE / MATCH Framework (2026)",
    seo_description:
      "How to edit AI-generated images without drift: the CHANGE / PRESERVE / MATCH structure for background swaps, object removal, style changes, and multi-turn editing chains.",
    content: `
## Why editing is harder than generating

Generating an image from a prompt is a single-shot operation. The model has total freedom — it just needs to satisfy your constraints.

Editing is fundamentally different. You're asking the model to change one thing while keeping everything else identical. That's a much harder problem, because "everything else" is a massive set of visual properties: lighting angle, color temperature, skin tones, fabric texture, shadow direction, grain structure, focal plane, and thousands of other details you don't consciously notice until they change.

Without structure, edits drift. Skin tones shift. Backgrounds bleed into subjects. Hair changes texture. Shadows point the wrong way. The result looks "pasted in" — which is worse than just generating from scratch.

## The framework: CHANGE / PRESERVE / MATCH

Every edit prompt should have exactly three blocks:

**CHANGE:** The one thing (or small set of things) you want different. Be specific about what replaces what.

**PRESERVE:** An explicit, exhaustive list of everything that must stay exactly the same. If you don't name it, the model may change it.

**MATCH:** The lighting, color, and grain logic that bridges the old and new elements. This is what prevents the "pasted in" look.

## Why three blocks, not two

Most people write edit prompts with just CHANGE and PRESERVE. They skip MATCH — and that's where the uncanny results come from.

When you swap a studio background for a rainy street, the subject's lighting shouldn't stay studio-flat. The new environment should cast subtle color spill onto the subject — cool blue from neon, warm orange from streetlights. Without the MATCH block, the model either keeps the original lighting (subject looks pasted) or re-lights everything (subject's face changes).

MATCH tells the model: keep the original lighting direction and intensity on the subject, but let the new environment influence color temperature and reflections naturally.

## Example 1: Background swap

**Rough idea:** "Put this portrait in a rainy Tokyo street at night"

\`\`\`
CHANGE: Replace the background with a rainy Tokyo street at night —
neon signs reflecting on wet pavement, blurred passing pedestrians,
soft bokeh from illuminated signage, light rain visible against
dark sky.

PRESERVE: Subject's face, expression, pose, hair, clothing, body
framing, skin tones, and exact silhouette — locked as in source.

MATCH: Keep original lighting direction on subject (rim from
camera-right). Subject's color temperature stays neutral, but add
subtle cool blue and magenta reflections on clothing and skin from
neon environment. Match original film grain and depth of field.
\`\`\`

## Example 2: Object removal

**Rough idea:** "Remove the trash can and power lines"

\`\`\`
CHANGE: Remove the green trash can in lower-left corner and the
power line crossing the upper third. Reconstruct the wall behind
the trash can using the existing brick pattern. Reconstruct the
sky as a clean continuous gradient matching the surrounding area.

PRESERVE: Every person, the storefront awning, parked car,
street signs, sidewalk texture, all cast shadows, window
reflections, and wall graffiti.

MATCH: Golden hour lighting from camera-right, warm color
temperature, existing film grain and vignette.
\`\`\`

## Example 3: Style transfer

**Rough idea:** "Make this photo look like a watercolor"

\`\`\`
CHANGE: Convert the photographic style to loose watercolor
painting — visible paper texture, soft wet-on-wet color bleeds,
unpainted white areas where highlights fall, slightly imprecise
edges.

PRESERVE: Composition, subject placement, relative proportions,
facial features and expression, clothing silhouette, background
element positions.

MATCH: Maintain the same value structure (darks and lights in the
same places). Simplify the color palette to 5-6 watercolor-plausible
hues. Preserve the original light direction through shadow placement.
\`\`\`

## Multi-turn editing: the drift problem

Single edits are manageable. The real challenge is multi-turn editing — making 3, 4, 5 changes to the same image across multiple generations. Each turn introduces small drift, and drift compounds.

By turn 3 or 4, the subject's face has subtly changed, the lighting is inconsistent, and the image has lost coherence.

**The fix: restate PRESERVE every turn.** Don't rely on the model remembering what to keep from previous turns. Copy-paste your full PRESERVE block into every edit prompt, updated to include anything new you added in previous turns.

**The second fix: work from the best previous output, not the original.** Each edit should reference the most recent good result, not the original image. This keeps the edit chain grounded.

## When to edit vs. when to regenerate

Edit when:
- You like 80%+ of the image and want to fix one element
- The composition, pose, and lighting are right but a detail is wrong
- You need to swap a background or remove an object
- You're doing style transfer on a specific composition

Regenerate when:
- The composition is fundamentally wrong
- Multiple major elements need changing
- The pose or framing doesn't work
- You're on edit turn 4+ and drift has accumulated

Regenerating with a refined prompt is often faster than fixing a broken edit chain.

## Common editing failures and fixes

**"Pasted in" look:** You're missing the MATCH block. Add color spill, reflection, and grain matching from the new environment.

**Face drift after 2-3 edits:** Your PRESERVE block isn't specific enough. Add: "facial bone structure, eye color, skin texture, exact hairline."

**Shadow inconsistency:** Name the light direction in MATCH. "Shadows cast to lower-left, consistent with key light from upper-right."

**Background bleeding into subject edges:** Add to PRESERVE: "exact silhouette edges, no feathering or blending at subject boundary."

**Grain mismatch:** Add to MATCH: "Match ISO grain structure and intensity of the source image."

## The shortcut

Writing CHANGE / PRESERVE / MATCH blocks manually is tedious, especially the exhaustive PRESERVE list. [Depikt's critique tool](/critique) can analyze your edit prompts and flag missing PRESERVE elements before you waste a generation on drift.
`,
  },
  {
    slug: "ai-image-prompt-mistakes",
    title: "7 AI Image Prompt Mistakes That Waste Your Generations",
    subtitle: "Common patterns that produce mediocre output — and what to do instead.",
    category: "Mistakes",
    author: "Depikt Team",
    read_time: "6 min",
    published: "2026-04-24",
    excerpt:
      "Most bad AI image results aren't the model's fault. They're prompt mistakes — patterns that feel natural to write but consistently produce generic, flat, or incoherent output. Here are the seven most common ones.",
    seo_title: "7 AI Image Prompt Mistakes That Waste Your Generations (2026)",
    seo_description:
      "The most common AI image prompt mistakes: adjective stacking, missing lighting, vague subjects, wrong aspect ratios, and more. With before/after fixes.",
    content: `
## Why most prompts underperform

The gap between a mediocre AI image and a good one is rarely about the model. It's about the prompt. And the same mistakes show up over and over — patterns that feel natural to write but consistently produce flat, generic, or incoherent results.

These aren't edge cases. They're the default way most people write prompts. Fixing them is the single highest-leverage thing you can do.

## Mistake 1: Adjective stacking

**The mistake:**
\`A stunning, beautiful, breathtaking, ultra-detailed, 8K masterpiece of a mountain landscape, hyper-realistic, epic, amazing\`

**Why it fails:** These adjectives carry no visual information. "Stunning" doesn't tell the model anything about composition, lighting, or color. With GPT Image 2's reasoning layer, these words actively compete with the structural details the model should be attending to.

**The fix:** Replace every adjective with an observable physical detail.

\`Mountain landscape at golden hour, long shadows raking across red sandstone, a single dead tree in the foreground, distant snow-capped peaks, thin cirrus clouds. Wide shot at 24mm, f/8, 3:2 landscape. Kodak Ektar 100.\`

## Mistake 2: No lighting direction

**The mistake:**
\`Portrait of a woman in a coffee shop, good lighting\`

**Why it fails:** "Good lighting" means nothing. The model picks the most generic, flat lighting it can — usually frontal and shadowless. Flat light kills depth and mood.

**The fix:** Name one specific light source with direction.

\`Portrait of a woman in a coffee shop, soft window light from camera-left, warm tungsten overhead creating slight rim on hair, shallow depth of field\`

One named light source transforms the entire image.

## Mistake 3: Vague subjects

**The mistake:**
\`A man standing in a city\`

**Why it fails:** A man could be anyone. A city could be anywhere. The model picks the most statistically average interpretation — and average is boring.

**The fix:** Add 3-4 specific details about the subject and 2-3 about the environment.

\`A tall man in his 30s wearing a worn olive field jacket, hands in pockets, looking off-frame to camera-left, standing on a rain-wet sidewalk in lower Manhattan at dusk, yellow taxi blurred in background\`

## Mistake 4: Ignoring aspect ratio

**The mistake:** Not specifying an aspect ratio and hoping the model picks the right one.

**Why it fails:** The model defaults to whatever ratio is most common in its training data for that subject — which is often wrong for your use case. A vertical story gets rendered as a landscape. A hero banner comes out square.

**The fix:** Always end with the exact ratio:

- **16:9** — web hero, YouTube thumbnail, landscape
- **9:16** — Instagram story, TikTok, vertical
- **4:5** — Instagram feed, portrait
- **1:1** — profile photo, square social
- **2:3** — Pinterest, print portrait
- **2.39:1** — cinematic widescreen

Lock it. Every time.

## Mistake 5: Asking for multiple competing styles

**The mistake:**
\`Watercolor painting, photorealistic, anime style, oil painting texture, digital art\`

**Why it fails:** Each style implies a completely different rendering approach. The model tries to satisfy all of them and produces a muddy hybrid that looks like none of them.

**The fix:** Pick one style and commit. If you want variations, generate separate images with different style specifications.

\`Loose watercolor painting on cold-press paper, visible brush strokes, wet-on-wet color bleeds at edges, limited palette of indigo, burnt sienna, and raw umber\`

## Mistake 6: Overloading text requests

**The mistake:**
\`A poster with the title, subtitle, three bullet points, a paragraph of body text, a footer with contact info, and a QR code\`

**Why it fails:** Image models are not layout engines. They can render 1-3 short text elements reliably. Beyond that, text degrades — characters garble, lines merge, spacing collapses.

**The fix:** Limit text to 1-3 elements, each with explicit placement and styling. For complex layouts with lots of text, generate the visual in AI and add text in Figma or Canva.

\`Event poster, 2:3 portrait. Headline "FUTURE STACK" in bold condensed sans-serif, white, upper third. Date "MARCH 14-16" in thin sans-serif below. Background: deep navy. Verbatim text — no extra characters.\`

## Mistake 7: Changing everything between iterations

**The mistake:** Getting a mediocre result and rewriting the entire prompt from scratch — changing the subject, composition, lighting, and style all at once.

**Why it fails:** When you change four variables simultaneously, you learn nothing. The next result might be better or worse, and you have no idea which change caused it.

**The fix:** Change one variable per iteration. Keep everything else constant. This is how you build intuition for what each lever actually does:

- **Iteration 1:** Change only the lighting direction
- **Iteration 2:** Change only the focal length
- **Iteration 3:** Change only the color palette

Slow iteration with single-variable changes beats fast iteration with random rewrites.

## The pattern behind all seven

Every mistake on this list is the same underlying error: giving the model vibes instead of constraints. "Stunning" is a vibe. "Soft window light from camera-left, f/1.8, 50mm" is a constraint.

AI image models produce better output when they're satisfying specific, concrete constraints than when they're trying to interpret abstract quality descriptors. The more precisely you constrain the image, the better it gets — which is counterintuitive but consistently true.

## Skip the mistakes

[Depikt](/generate) applies these fixes automatically. Paste a rough idea — even one that makes every mistake on this list — and get back a structured prompt that avoids all seven. It's the fastest way to stop wasting generations.
`,
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Examples: "from-amber-500/30 to-orange-500/10",
  Tips: "from-blue-500/30 to-indigo-500/10",
  Framework: "from-emerald-500/30 to-teal-500/10",
  "How-to": "from-rose-500/30 to-pink-500/10",
  Comparison: "from-violet-500/30 to-purple-500/10",
  Guide: "from-cyan-500/30 to-blue-500/10",
  Mistakes: "from-red-500/30 to-orange-500/10",
};

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, category: string, limit = 2): Post[] {
  const sameCategory = posts.filter((p) => p.slug !== slug && p.category === category);
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  // Fall back to recent posts from other categories
  const others = posts.filter((p) => p.slug !== slug && !sameCategory.includes(p));
  return [...sameCategory, ...others].slice(0, limit);
}
