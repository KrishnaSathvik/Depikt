# Depikt OG image prompts

Six route-level social cards for Depikt. All six belong to one family and are generated with
ChatGPT Images 2.5 (`gpt-image-2.5-sunburst`, quality `high`) using `public/logo.png` as the
only reference image. Generation runs outside the product with
`node scripts/og-images-run.ts [home|library|builder|critic|gallery|blog|all]` (needs
`OPENAI_API_KEY` in `.env.local`). The model renders 1536×864 (16:9); the script center-crops to
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
Create a premium 1200×630 Open Graph image for Depikt's Prompt Library.

Use the attached Depikt logo as the exact brand reference. Preserve its shape, proportions, spacing, and appearance exactly. Do not redraw, reinterpret, distort, embellish, or replace the logo.

DESIGN SYSTEM

Clean editorial composition on a pure white background.
Near-black typography.
Very thin neutral-gray rules where useful.
Generous negative space.
Modern creative-tool aesthetic.
Sophisticated, restrained, highly legible at small social-preview sizes.

Do not make this look like a SaaS dashboard.

LAYOUT

Left side:
Place the Depikt logo near the upper-left.

Below it, large headline:

"Prompt Library"

Below the headline, smaller text:

"543 prompts to learn from, remix, and use."

Right side:
Create a carefully art-directed collection of 6–8 visual fragments representing different image-prompt use cases:

- editorial poster
- product photography
- infographic
- cinematic photography
- UI concept
- illustration
- reference-based edit

Arrange them like a refined editorial contact sheet, not a uniform dashboard grid.

Use different visual styles across the fragments while keeping the overall composition coherent.

Some tiles may overlap or crop naturally.
Use thin borders only.
No heavy shadows.

TEXT — EXACT

Render only:

"Prompt Library"

"543 prompts to learn from, remix, and use."

Do not add any other readable text inside the visual fragments.

Do not add URLs, model names, badges, captions, watermarks, or fake UI labels.

STYLE RESTRICTIONS

No gradients in the background.
No glowing AI effects.
No robots.
No floating spheres.
No chat bubbles.
No browser windows.
No device mockups.
No fake application interface.
No excessive shadows.

OUTPUT

1200×630 pixels.
Landscape.
Crisp typography.
Strong thumbnail readability.
Premium editorial social-sharing image.
```

## 3. Prompt (`public/og/prompt.png`)

```text
Create a premium 1200×630 Open Graph image for Depikt's unified Prompt workspace.

Use the attached Depikt logo as the exact brand reference. Preserve it exactly. Do not redraw, reinterpret, distort, embellish, or replace it.

The Prompt workspace has two modes:
Build a prompt
Critique a prompt

The visual should communicate both without looking like a software screenshot.

DESIGN SYSTEM

Pure white canvas.
Near-black typography.
Neutral-gray secondary elements.
Thin editorial rules.
Generous whitespace.
Minimal, intelligent, creative-tool aesthetic.

LAYOUT

Place the Depikt logo in the upper-left.

Large headline:

"Build it.
Improve it."

Below it, smaller line:

"One workspace for better image prompts."

On the right, create an abstract editorial transformation showing a rough creative idea becoming a precise structured prompt.

Use three stages visually:

1. loose handwritten or fragmented idea
2. organized structural blocks
3. refined final prompt composition

Also include a subtle critique layer using restrained annotations, underlines, or editorial marks suggesting improvement and review.

This should feel like an editorial visualization of thinking becoming structured — not a real app interface.

Do not create fake buttons, menus, browser chrome, or dashboards.

TEXT — EXACT

Render only:

"Build it.
Improve it."

"One workspace for better image prompts."

Do not add labels such as Build, Critique, score, input, output, or other UI text inside the visual.

STYLE

Clean modern grotesk typography.
Strong hierarchy.
Minimal black and gray structure.
A small amount of restrained color may appear in the visual transformation only.

No glowing AI imagery.
No robots.
No chat bubbles.
No code.
No gradients in the page background.
No 3D text.
No heavy shadows.

OUTPUT

1200×630 pixels.
Landscape.
Crisp.
Editorial.
High contrast.
Designed specifically for social-link previews.
```

## 4. Templates (`public/og/templates.png`)

```text
Create a premium 1200×630 Open Graph image for Depikt Templates.

Use the attached Depikt logo as the exact brand reference. Preserve it exactly and do not redraw, reinterpret, distort, or embellish it.

CONCEPT

Templates are reusable structures for common image-making tasks — not finished prompt examples.

DESIGN SYSTEM

Pure white canvas.
Near-black typography.
Neutral-gray structural lines.
Minimal editorial grid.
Generous negative space.
Intelligent and practical rather than decorative.

LAYOUT

Place the Depikt logo in the upper-left.

Large headline:

"Start with a structure."

Smaller line:

"Reusable templates for common image tasks."

On the right, create a refined visual system of partially completed creative frameworks.

Show several distinct structures suggesting:

- poster
- product photography
- infographic
- image edit
- reference-based composition
- storyboard

Represent them using abstract labeled-field shapes, crop frames, image placeholders, typographic hierarchy blocks, and composition guides.

They should feel like creative blueprints waiting to be filled in.

Do NOT create six finished artworks.
The idea should clearly be STRUCTURE BEFORE RESULT.

Use thin lines, a restrained editorial grid, and perhaps one or two small color accents.

TEXT — EXACT

Render only:

"Start with a structure."

"Reusable templates for common image tasks."

Do not render template names or placeholder text inside the structures.
No fake form labels.
No URLs.
No model names.
No badges.

STYLE RESTRICTIONS

No dashboard UI.
No browser window.
No colorful card grid.
No AI imagery.
No glowing effects.
No 3D elements.
No background gradients.
No excessive shadows.

OUTPUT

1200×630 pixels.
Landscape.
Crisp typography.
Editorial information-design quality.
Strong thumbnail readability.
```

## 5. Gallery (`public/og/gallery.png`)

```text
Create a premium 1200×630 Open Graph image for Depikt's Reference Gallery.

Use the attached Depikt logo as the exact brand reference. Preserve it exactly without redrawing, modifying, or stylizing it.

DESIGN SYSTEM

Pure white background.
Near-black typography.
Very thin neutral-gray framing.
Large areas of negative space.
High-end editorial exhibition feel.

LAYOUT

Place the Depikt logo in the upper-left.

Large headline:

"Reference Gallery"

Smaller line underneath:

"Find a visual direction. Make it your own."

Make imagery the main focus.

Create a sophisticated gallery-wall composition of 5–7 distinct visual reference fragments:

- cinematic photograph
- bold graphic poster
- architectural image
- editorial illustration
- product composition
- textured artwork
- structured design piece

Use different aspect ratios.
Allow elegant cropping and slight overlaps.
Some images can extend beyond the right or bottom edge.

The arrangement should feel curated by an art director, not like a Pinterest grid or application gallery.

Do not place text inside the reference images.

TEXT — EXACT

Render only:

"Reference Gallery"

"Find a visual direction. Make it your own."

No additional readable text.
No URLs.
No model names.
No captions.
No fake metadata.
No watermarks.

STYLE RESTRICTIONS

No browser chrome.
No UI controls.
No device mockups.
No AI clichés.
No glowing effects.
No huge shadows.
No colorful background gradients.

OUTPUT

1200×630 pixels.
Landscape.
Premium editorial presentation.
Excellent social-preview legibility.
```

## 6. Blog (`public/og/blog.png`)

```text
Create a premium 1200×630 Open Graph image for Depikt's Blog / Field Notes.

Use the attached Depikt logo as the exact brand reference. Preserve it exactly without changing its shape, proportions, or visual identity.

CONCEPT

Depikt's Blog is a collection of practical field notes about image prompting, reference workflows, editing, structured visuals, models, and lessons learned from real image-generation work.

The image should feel like an independent design publication, not a product advertisement.

DESIGN SYSTEM

Warm-white or pure-white editorial paper-like canvas.
Near-black typography.
Fine neutral-gray rules.
Extremely restrained visual system.
Magazine-quality art direction.
Generous whitespace.

LAYOUT

Place the Depikt logo small near the upper-left.

Use the large editorial headline:

"Field Notes."

Below it:

"Prompts, references, experiments, and what actually works."

Create one strong supporting editorial composition on the right.

Combine:

- a cropped visual study
- a small prompt fragment represented abstractly without readable text
- a simple diagram or annotation
- one photographic or illustrated fragment

Arrange these like material pinned or composed on an art director's desk, but keep everything flat and sophisticated rather than photorealistic stationery clutter.

The overall impression should be:

research
experimentation
visual culture
practical knowledge

TEXT — EXACT

Render only:

"Field Notes."

"Prompts, references, experiments, and what actually works."

No article titles.
No dates.
No URLs.
No model names.
No fake handwriting that becomes readable text.
No additional captions.
No watermarks.

STYLE RESTRICTIONS

No blog-dashboard appearance.
No browser mockup.
No laptop/device.
No glowing AI imagery.
No robots.
No colorful gradient background.
No excessive paper texture.
No heavy shadows.

OUTPUT

1200×630 pixels.
Landscape.
Crisp typography.
High-end editorial publication quality.
Designed specifically for X, LinkedIn, Slack, Messages, and other social-link previews.
```

## 7. MCP (`public/og/mcp.png`)

```text
Create a premium 1200×630 Open Graph image announcing Depikt's MCP integration.

Use the attached Depikt logo as the exact brand reference. Preserve its exact shape and proportions. Do not redraw or alter the logo.

CONCEPT

Depikt's public prompt library, templates, and guides can now be accessed directly by MCP-compatible AI assistants.

Do not make the image look like developer documentation or an API dashboard.

DESIGN SYSTEM

White canvas.
Near-black typography.
Thin neutral-gray lines.
Minimal editorial information-design aesthetic.
Generous whitespace.
Technical but approachable.

LAYOUT

Place the Depikt logo in the upper-left.

Large headline:

"Depikt, now through MCP."

Smaller line:

"Prompts, templates, and guides — available to your assistant."

On the right side, create an elegant information-flow visualization.

Show one central Depikt source represented by a clean editorial stack of:

- prompt
- template
- guide

Represent these three layers with abstract symbols only (a page, a grid, an open book). Do not write the words "prompt", "template", or "guide" anywhere in the image; the stack must carry no legible text.

From that central source, thin precise lines flow outward toward several abstract assistant endpoints.

Do NOT use ChatGPT, Claude, OpenAI, Anthropic, or other company logos.

Represent assistants only through neutral geometric conversation/workspace symbols.

The visual should communicate:

one public knowledge source
→ multiple assistants
→ read-only access

Optionally use subtle tiny lock/open-book/reference symbols, but keep them abstract and minimal.

TEXT — EXACT

Render only:

"Depikt, now through MCP."

"Prompts, templates, and guides — available to your assistant."

Do not add:
"API"
"server"
"endpoint"
"public"
"read-only"
URLs
company names
company logos
technical code
watermarks

STYLE RESTRICTIONS

No matrix graphics.
No neon networking.
No glowing nodes.
No robots.
No cloud diagrams.
No terminal windows.
No fake chat screenshots.
No gradients in the background.

OUTPUT

1200×630 pixels.
Landscape.
Precise editorial composition.
Crisp typography.
Strong social-preview readability.
```
