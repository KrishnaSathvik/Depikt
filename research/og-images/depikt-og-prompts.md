# Depikt OG image prompts

Six route-level social cards for Depikt. All six belong to one family and are generated with
ChatGPT Images 2.5 (`gpt-image-2.5-sunburst`, quality `high`) using `public/logo.png` as the
only reference image. Generation runs outside the product with
`node scripts/og-images-run.ts [home|library|builder|critic|gallery|blog|all]` (needs
`OPENAI_API_KEY` in `.env`). The model renders 1536×864 (16:9); the script center-crops to
1536×806 and resizes to 1200×630, so every prompt keeps a 5% top/bottom safe margin.

Attempts, logs, and rejected takes live in `research/og-images/runs/`. Only the approved
1200×630 PNGs are copied to `public/og/<route>.png`.

## Shared block (prepended to every prompt)

```text
Create a premium social sharing image for Depikt, an image-prompt workspace. Landscape 16:9;
keep all text and the logo inside a central safe area with at least 5% margin top and bottom,
because the image is cropped slightly shorter for link previews.

BRAND REFERENCE
Use the attached Depikt logo as the exact brand mark. Preserve its shape and proportions
exactly; do not redraw, reinterpret, distort, embellish, recolor, or replace it. Place it
small, near the upper-left, with generous breathing room. Do not invent any other logo,
symbol, or brand mark.

VISUAL SYSTEM
Pure white background. Near-black typography in a clean modern grotesk sans-serif, medium
weight. Neutral-gray secondary text. Very thin neutral-gray hairline rules may be used
sparingly. Minimal editorial composition with a clear grid, strong hierarchy, and generous
negative space. It should read like a high-end design publication or a creative-tool launch
image, not a SaaS advertisement. Any color comes only from the artwork, never from the
background or the type.

DO NOT INCLUDE
Gradients in the background, glowing AI effects, floating spheres, circuit patterns, robots,
chat bubbles, fake application interfaces, browser chrome, device mockups, navigation bars,
3D text, heavy drop shadows, decorative AI clichés, stock-photo collage, paragraphs of copy,
URLs, model names, ChatGPT or OpenAI branding, the word "AI", dates, badges, captions, or
watermarks. Third-party logos are forbidden.

TEXT
Render only the text listed under TEXT — EXACT for this card, spelled exactly as written,
and nothing else legible anywhere in the image.

OUTPUT
Crisp typography, high contrast, strong readability at thumbnail size, designed to look
excellent as a link preview on X, LinkedIn, Slack, and iMessage.
```

## 1. Home (`public/og/home.png`)

```text
LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large two-line headline,
left aligned:
"Better prompts.
Better images."
Below the headline, much smaller neutral-gray text: "Build · Critique · Explore".

Right 50% of the canvas: one carefully composed artwork made from four distinct
image-making fragments arranged as a single editorial composition, not four cards:
1. a refined typographic poster fragment with abstract editorial geometry,
2. a cinematic photographic fragment with natural light,
3. a clean structured infographic or layout fragment,
4. a hand-drawn pencil sketch transitioning subtly into a finished rendered form.
The fragments overlap and crop deliberately, connected by alignment and one shared light
direction. Different mediums, one coherent, elegant image. Any text inside the fragments
must be abstract marks, not readable words.

TEXT — EXACT
"Better prompts.
Better images."
"Build · Critique · Explore"
```

## 2. Library (`public/og/library.png`)

```text
LAYOUT
Left 40%: the Depikt logo upper-left. Below it, headline in two lines, left aligned:
"Prompt Library"
Below it, smaller neutral-gray text: "523 prompt examples".

Right 56%: a modular inspiration wall of six miniature image tiles on a strict grid with
thin hairline gaps, varied aspect ratios (two tall, three square, one wide), each a
different medium: a travel poster with abstract type shapes, a product photograph on a
plain sweep, a flat-vector infographic, a watercolor illustration, an architectural
minimalist poster, and a black-and-white portrait. Tiles are complete and evenly lit; the
wall feels curated and calm, never noisy. No readable text inside tiles.

TEXT — EXACT
"Prompt Library"
"523 prompt examples"
```

## 3. Prompt Builder (`public/og/prompt-builder.png`)

```text
LAYOUT
Left 46%: the Depikt logo upper-left. Below it, headline in two lines, left aligned:
"Prompt Builder"
Below it, smaller neutral-gray text: "From idea to prompt".

Right 50%: a light editorial transformation in two stages joined by a single thin
hairline arrow. Stage one, upper-left of the right half: a small torn-notebook scrap with a
loose pencil scribble and a tiny rough thumbnail sketch, suggesting a rough idea. Stage two,
lower-right: a clean white card with a hairline border containing neat rows of short
abstract text bars in three lengths, structured like a well-written prompt, with a small
finished image tile clipped to its corner (a warm-light photograph of a simple object). The
prompt card is light and paper-like, never a dark code block or terminal. No readable text
in either stage.

TEXT — EXACT
"Prompt Builder"
"From idea to prompt"
```

## 4. Prompt Critic (`public/og/prompt-critic.png`)

```text
LAYOUT
Left 46%: the Depikt logo upper-left. Below it, headline in two lines, left aligned:
"Prompt Critic"
Below it, smaller neutral-gray text: "Find what's weakening it".

Right 50%: a single light card with a hairline border holding rows of abstract text bars
that stand in for a prompt. Three of the rows carry restrained editorial markup: one thin
near-black underline, one small circled region, one short hairline leader running to a tiny
neutral-gray margin note rendered as abstract marks. A small, elegant ring gauge sits at the
card's upper-right, roughly three-quarters filled in near-black. Analytical and calm, like a
proofread manuscript; no red error styling, no dashboard, no charts.

TEXT — EXACT
"Prompt Critic"
"Find what's weakening it"
```

## 5. Gallery (`public/og/gallery.png`)

```text
LAYOUT
Image-first. The Depikt logo small in the upper-left over white. Headline in the lower-left
inside the safe area, one line: "Gallery"; beneath it, smaller neutral-gray text:
"See what prompts can produce".

The remaining canvas, mostly the right two-thirds, is a premium exhibition wall: five
finished images presented as thin-framed prints with slight overlap and one dominant
landscape piece. Mediums: a cinematic golden-hour landscape photograph, an impressionist
cityscape painting, a stark black-and-white architectural photograph, a mosaic-textured
abstract, and a bold flat-color poster with abstract type shapes. Soft, even museum light,
subtle real shadows, white wall. No readable text in the prints.

TEXT — EXACT
"Gallery"
"See what prompts can produce"
```

## 6. Blog (`public/og/blog.png`)

```text
LAYOUT
Typography-led. Left 50%: the Depikt logo upper-left. Below it, headline in one line:
"Field Notes"; beneath it, smaller neutral-gray text: "Prompt guides".

Right 44%: one supporting element only: a single sheet of white paper with a hairline
border, slightly rotated, carrying a structured note rendered as abstract marks: a short
title bar, a numbered list of three items indicated by small dots, a two-column mini table
with hairline rules, and a tiny thumbnail image tile pinned at the corner (a simple
still-life photograph in natural light). One thin hairline rule runs horizontally across the
white space beneath the sheet. Thoughtful and informative, not promotional.

TEXT — EXACT
"Field Notes"
"Prompt guides"
```
