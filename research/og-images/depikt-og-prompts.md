# Depikt OG image prompts

Route-level social cards for Depikt. They belong to one family and are generated with
ChatGPT Images 2.5 (`gpt-image-2.5-sunburst`, quality `high`) using `public/logo.png` as the
only reference image. Generation runs outside the product with
`node scripts/og-images-run.ts [home|library|prompt|templates|gallery|blog|mcp|generate|pricing|help|terms|privacy|signIn|signUp|all]`
(needs `OPENAI_API_KEY` in `.env.local`). The model renders 1536×864 (16:9); the script
center-crops to 1536×806 and resizes to 1200×630, so every prompt keeps a 5% top/bottom safe
margin.

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
Create the social card for Depikt's reusable image-prompt Templates.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"Start with structure."

Below the headline, much smaller neutral-gray text:

"Make the idea your own."

On the right, show three thoughtfully arranged visual frameworks:
a portrait poster layout, a landscape explanatory composition,
and a square product-image layout.

Use fine gray alignment rules, clean image regions, and simple geometric
elements. Let one framework contain a small finished illustration while the
others retain their open structure.

These are conceptual design frameworks, not screenshots or interactive forms.
Do not render a wall of empty input fields or fake template-builder UI.

The visual should make structure feel useful and creative rather than rigid.
Keep lines crisp, white space generous, and accent color limited to one small
muted-blue region.

TEXT — EXACT
"Start with structure."
"Make the idea your own."

Do not render template names, field labels, or placeholder text inside the frameworks.
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
Create the social card for Depikt's public read-only MCP integration.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"Depikt, in your assistant."

Below the headline, much smaller neutral-gray text:

"Prompts. Templates. Guides."

On the right, create a precise editorial connection diagram:
three small document-like forms converge through fine lines into one
abstract conversation-shaped form.

The three source forms should visually suggest a prompt, a reusable structure,
and a guide, using only geometry and short non-readable rules.

Make the direction of information clear: published knowledge moving toward
an assistant. Do not show image generation, private account access, payments,
or write actions.

No terminal window, JSON screenshot, robot, glowing network, or provider logos.
The supplied Depikt logo is the only brand mark.

Use near-black lines and one restrained muted-blue connection.

TEXT — EXACT
"Depikt, in your assistant."
"Prompts. Templates. Guides."
```

## 8. Generate (`public/og/generate.png`)

```text
Create the social card for Depikt's Generate mode.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"From prompt to picture."

Below the headline, much smaller neutral-gray text:

"Create. Edit. Make it yours."

Use one dominant finished image on the right: an elegant cobalt-blue ceramic
sculpture on a pale neutral pedestal, with sculptural natural light and a
beautifully controlled shadow. The image should feel intentional and worth making.

At one edge of that image, introduce a very restrained transition from a fine
construction outline into the finished photographic form. Keep this transition
subtle and localized, not a futuristic effect.

This is illustrative artwork, not a screenshot of the Depikt application.

Do not use a large loading-dot field as the main subject. The card should
communicate a finished image, not waiting for one.

No model selector, quality labels, credits, or technical controls.

TEXT — EXACT
"From prompt to picture."
"Create. Edit. Make it yours."
```

## 9. Pricing (`public/og/pricing.png`)

```text
Create the social card for Depikt Pricing.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"More room to create."

Below the headline, much smaller neutral-gray text:

"Free · Pro · Max"

On the right, create three precisely aligned editorial image frames with
progressively more room inside them. Use one related abstract visual motif
across the frames, with each composition becoming broader and more expressive.

This is a conceptual illustration of different creation allowances,
not a screenshot of pricing cards.

Do not print dollar amounts, monthly allowances, percentages, discount claims,
or "Most popular" badges. Do not imply unlimited image generation.

The design should feel clear and approachable rather than aggressively
promotional. No coins, money stacks, credit cards, charts, or sale graphics.

Maintain the same white canvas and typographic hierarchy as the other Depikt cards.

TEXT — EXACT
"More room to create."
"Free · Pro · Max"
```

## 10. Help (`public/og/help.png`)

```text
Create the social card for Depikt Help.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"How Depikt works."

Below the headline, much smaller neutral-gray text:

"Images, credits, and your account."

On the right, create a crisp editorial illustration that moves from a simple
question-shaped mark to an ordered sequence of three visual steps.

Use fine rules, small geometric image-frame symbols, and clear spacing.
The visual should suggest understanding a process, not talking to a support agent.

Keep the question mark secondary to the headline and avoid turning it into
an oversized generic help icon.

No live-chat bubble interface, headset operator, support email, customer-service
promise, chatbot mascot, or "24/7" language.

Use black and gray with one small muted-blue point of emphasis.

TEXT — EXACT
"How Depikt works."
"Images, credits, and your account."
```

## 11. Terms (`public/og/terms.png`)

```text
Create a restrained social card for Depikt's Terms of Service.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"Terms of Service"

Below the headline, much smaller neutral-gray text:

"Using Depikt, clearly explained."

Keep typography dominant. On the right, use a minimal abstract document
composition: one white page form with a few dark section rules and carefully
aligned margins. A second fine outline may sit behind it for depth.

The composition should communicate readable information, not intimidating
legal machinery.

Do not render legal paragraphs, dates, signatures, official stamps,
certification marks, scales of justice, gavels, courthouses, or fabricated
company details.

Use white, near-black, and very light neutral gray only.
This card should feel like part of the Depikt product family, not a law-firm ad.

TEXT — EXACT
"Terms of Service"
"Using Depikt, clearly explained."
```

## 12. Privacy (`public/og/privacy.png`)

```text
Create a restrained social card for Depikt's Privacy Policy.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"Privacy Policy"

Below the headline, much smaller neutral-gray text:

"How your information is handled."

On the right, create a minimal editorial composition using two neatly layered
white information panels, precise boundaries, and a small abstract image frame.

The visual should communicate care, clarity, and deliberate handling of
information. Keep it abstract rather than suggesting a specific security feature.

Do not use locks, shields, fingerprint scans, encryption graphics, compliance
badges, or claims such as "completely private", "zero tracking", or "end-to-end
encrypted".

No personal information, names, email addresses, account screenshots, or dates.

Use the same typography and logo placement as the Terms card, but a distinct
arrangement of the visual elements.

TEXT — EXACT
"Privacy Policy"
"How your information is handled."
```

## 13. Sign in (`public/og/sign-in.png`)

```text
Create the social card for signing in to Depikt.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"Welcome back."

Below the headline, much smaller neutral-gray text:

"Continue where you left off."

On the right, create a small, elegant arrangement of two creative image prints
and one understated bookmark-like marker, suggesting returning to ongoing work.

Use an architectural photograph and an abstract print with coordinated tones.
These are illustrative creative artifacts, not screenshots of a real account
or claims about a particular user's saved work.

Do not show login fields, provider buttons, personal avatars, email addresses,
passwords, social-provider logos, or fake user names.

Keep the mood calm and familiar. Use the same white background and near-black
typography as the rest of the Depikt OG family.

TEXT — EXACT
"Welcome back."
"Continue where you left off."
```

## 14. Sign up (`public/og/sign-up.png`)

```text
Create the social card for creating a Depikt account.

LAYOUT
Left 44% of the canvas: the Depikt logo upper-left. Below it, a large headline, left aligned:

"Your next idea starts here."

Below the headline, much smaller neutral-gray text:

"Create your Depikt account."

On the right, create a visual beginning: one clean portrait-format image frame
containing an emerging abstract landscape composition, with a second small
geometric element outside the frame suggesting another possibility.

Make this feel inviting and creative, not like an empty loading placeholder.
The artwork should already be visually satisfying.

Do not use confetti, gift boxes, badges, free-credit banners, countdowns,
fake testimonials, user counts, login fields, or provider logos.

Keep subscription prices and credit quantities out of this artwork.
The headline and composition should remain useful even if the starter allowance
changes later.

TEXT — EXACT
"Your next idea starts here."
"Create your Depikt account."
```

