/**
 * Depikt Templates — canonical, model-neutral task structures.
 *
 * A template is NOT a prompt example (that is the Library). A template is a
 * reusable structure for a common image-making job: the user brings the
 * details, the structure keeps them from forgetting what actually changes the
 * image.
 *
 * Rules for this file:
 * - Model-neutral. No `--ar`, no `--stylize`, no API quality flags, no model
 *   identifiers inside `template_prompt`. Those are model settings, not
 *   creative structure. The Prompt workspace (Build mode) adapts the filled structure for the
 *   target model.
 * - ONE template per job. No "Poster for Images 2.5" / "Poster for Midjourney"
 *   duplicates.
 * - This file is the single source of truth: the /templates page, the
 *   Template → Prompt (Build mode) flow, and the public MCP tools all read it.
 */

export type TemplateGroup = "Create" | "Structure" | "Edit" | "References" | "Brand";

export const TEMPLATE_GROUPS: readonly TemplateGroup[] = [
  "Create",
  "Structure",
  "Edit",
  "References",
  "Brand",
];

/** Website category labels. Internal group names stay stable for MCP and tests. */
export const TEMPLATE_GROUP_LABEL: Record<TemplateGroup, string> = {
  Create: "Create",
  Structure: "Design & explain",
  Edit: "Edit",
  References: "References",
  Brand: "Brand",
};

export const TEMPLATE_GROUP_BLURB: Record<TemplateGroup, string> = {
  Create: "Make a new image from an idea.",
  Structure: "Turn information, interfaces or sequences into structured visuals.",
  Edit: "Change an image you already have.",
  References: "Use existing images to guide identity, style or composition.",
  Brand: "Create or apply a visual identity.",
};

/**
 * What the template needs from the image model. Not a model name — a capability.
 * - general: works with any modern image generator.
 * - reference-recommended: much better with models that accept reference images.
 * - editing-required: needs a model that can edit an existing image.
 */
export type TemplateCompatibility = "general" | "reference-recommended" | "editing-required";

export const COMPATIBILITY_NOTE: Record<TemplateCompatibility, string | null> = {
  general: null,
  "reference-recommended": "Works best with image models that support reference images.",
  "editing-required": "Requires an image model that can edit an existing image.",
};

export interface TemplateField {
  /** Placeholder key; appears in `template_prompt` as [KEY]. */
  key: string;
  /** Human label shown on the page and returned over MCP. */
  label: string;
  /** Optional one-line guidance. */
  hint?: string;
  /** Multi-line input on the page. */
  long?: boolean;
  /** Must be answered before the template can continue into Prompt. One or two per template. */
  required?: boolean;
  /** Plain-language input placeholder; falls back to "e.g." + example_input. */
  placeholder?: string;
}

export interface Template {
  id: string;
  slug: string;
  title: string;
  short_title: string;
  group: TemplateGroup;
  description: string;
  best_for: string;
  compatibility: TemplateCompatibility;
  fields: TemplateField[];
  /** The model-neutral skeleton. Placeholders are [FIELD_KEY]. */
  template_prompt: string;
  /** A worked example keyed by field key — used for input placeholders. */
  example_input: Record<string, string>;
  tags: string[];
  sort_order: number;
  active: boolean;
  updated_at: string;
}

const UPDATED = "2026-09-12";

export const templates: Template[] = [
  // ---------------------------------------------------------------- Create
  {
    id: "portrait-photography",
    slug: "portrait-photography",
    title: "Portrait / Photography",
    short_title: "Portrait",
    group: "Create",
    description:
      "Create portraits and lifestyle photos with clear control over the person, setting, framing and light.",
    best_for: "Editorial portraits, lifestyle scenes, people photos",
    compatibility: "general",
    fields: [
      {
        key: "SUBJECT",
        label: "Subject",
        required: true,
        hint: "Who is in the frame, described concretely",
      },
      { key: "ACTION", label: "Pose or action" },
      { key: "ENVIRONMENT", label: "Environment" },
      { key: "FRAMING", label: "Framing", hint: "Close-up, head-and-shoulders, full body, angle" },
      { key: "LIGHTING", label: "Lighting", hint: "Direction, quality, time of day" },
      { key: "MOOD", label: "Mood" },
      { key: "STYLE", label: "Visual style" },
      { key: "FORMAT", label: "Format", hint: "Orientation or ratio" },
    ],
    template_prompt: `A [STYLE] photograph of [SUBJECT].

Action: [ACTION]
Setting: [ENVIRONMENT]
Framing: [FRAMING]
Lighting: [LIGHTING]
Mood: [MOOD]
Format: [FORMAT]

Keep the subject clearly the focus, with a believable depth of field and natural skin and fabric texture.`,
    example_input: {
      SUBJECT: "a woman in her thirties with short dark hair, wearing a charcoal wool coat",
      ACTION: "standing still, looking off-camera to the right",
      ENVIRONMENT: "a quiet city street at the end of the day",
      FRAMING: "head-and-shoulders, subject on the right third",
      LIGHTING: "low warm sun from camera-right, soft fill from a pale wall on the left",
      MOOD: "calm, contemplative",
      STYLE: "editorial 35mm film",
      FORMAT: "3:2 landscape",
    },
    tags: ["portrait", "photography", "people", "editorial"],
    sort_order: 1,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "product-photography",
    slug: "product-photography",
    title: "Product Photography",
    short_title: "Product",
    group: "Create",
    description:
      "Show a product accurately for a shop page, launch or campaign, with the surface, angle and lighting you choose.",
    best_for: "Ecommerce packshots, launch imagery, campaign product shots",
    compatibility: "general",
    fields: [
      { key: "PRODUCT", label: "Product", required: true },
      {
        key: "ACCURATE_DETAILS",
        label: "Details that must stay accurate",
        hint: "Shape, material, closure, proportions",
        long: true,
      },
      { key: "SURFACE", label: "Surface" },
      { key: "ENVIRONMENT", label: "Environment" },
      { key: "ANGLE", label: "Camera angle" },
      { key: "LIGHTING", label: "Lighting" },
      { key: "BRAND_MOOD", label: "Brand mood" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `A product photograph of [PRODUCT].

Product accuracy — keep exactly as described: [ACCURATE_DETAILS]
Surface: [SURFACE]
Environment: [ENVIRONMENT]
Camera angle: [ANGLE]
Lighting: [LIGHTING]
Brand mood: [BRAND_MOOD]
Format: [FORMAT]

The product stays sharp and correctly proportioned. No invented logos or label text.`,
    example_input: {
      PRODUCT: "a matte black ceramic skincare bottle with a brushed metal cap",
      ACCURATE_DETAILS: "cylindrical body with a slight taper, screw cap, no visible branding",
      SURFACE: "raw concrete slab",
      ENVIRONMENT: "minimal studio corner with a soft falloff background",
      ANGLE: "slightly above eye level, product centered",
      LIGHTING: "soft directional window light from the left, gentle white bounce on the right",
      BRAND_MOOD: "quiet, premium, understated",
      FORMAT: "1:1 square",
    },
    tags: ["product", "ecommerce", "packshot", "studio"],
    sort_order: 2,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "poster-flyer",
    slug: "poster-flyer",
    title: "Poster / Flyer",
    short_title: "Poster",
    group: "Create",
    description:
      "Make an event poster, flyer or editorial artwork where the headline and details read exactly as written.",
    best_for: "Events, editorial posters, promotional artwork",
    compatibility: "general",
    fields: [
      { key: "PURPOSE", label: "What the poster is for", required: true },
      { key: "HEADLINE", label: "Exact headline" },
      { key: "SUPPORTING_TEXT", label: "Supporting text", long: true },
      { key: "SUBJECT", label: "Main visual" },
      { key: "HIERARCHY", label: "Information hierarchy" },
      { key: "STYLE", label: "Style or medium" },
      { key: "PALETTE", label: "Palette" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a [FORMAT] poster for [PURPOSE].

Main headline:
"[HEADLINE]"

Supporting text:
"[SUPPORTING_TEXT]"

Visual subject:
[SUBJECT]

Composition:
[HIERARCHY]

Visual direction:
[STYLE]

Color:
[PALETTE]

Keep the headline clearly dominant, spell all text exactly as written, and preserve generous negative space around the main text.`,
    example_input: {
      PURPOSE: "a late-summer open-air jazz night",
      HEADLINE: "NIGHT SESSIONS",
      SUPPORTING_TEXT: "Friday 12 September · 8pm · Riverside Park",
      SUBJECT: "a single upright bass silhouetted against a low sun",
      HIERARCHY: "headline top third, subject centered, details in one line at the bottom",
      STYLE: "screen-printed mid-century concert poster",
      PALETTE: "burnt orange, deep navy, warm off-white",
      FORMAT: "2:3 portrait",
    },
    tags: ["poster", "flyer", "typography", "event"],
    sort_order: 3,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "social-creative",
    slug: "social-creative",
    title: "Social Creative / Ad",
    short_title: "Social",
    group: "Create",
    description:
      "Make a social post, launch graphic or ad with one clear message and one readable headline.",
    best_for: "Instagram and X posts, launch graphics, paid social",
    compatibility: "general",
    fields: [
      { key: "PLATFORM", label: "Platform or use" },
      { key: "MESSAGE", label: "The one message", required: true },
      { key: "SUBJECT", label: "Product or subject" },
      { key: "HEADLINE", label: "Exact headline" },
      { key: "CTA", label: "CTA text", hint: "Optional" },
      { key: "COMPOSITION", label: "Composition" },
      { key: "STYLE", label: "Visual direction" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a [FORMAT] social creative for [PLATFORM].

Message: [MESSAGE]
Subject: [SUBJECT]

Headline, spelled exactly:
"[HEADLINE]"

Call to action, spelled exactly:
"[CTA]"

Composition: [COMPOSITION]
Visual direction: [STYLE]

Keep the headline legible at thumbnail size and leave safe margins around every edge.`,
    example_input: {
      PLATFORM: "Instagram feed",
      MESSAGE: "the app now writes prompts from a single sentence",
      SUBJECT: "a phone showing a short typed sentence turning into a longer prompt",
      HEADLINE: "One sentence in. One great prompt out.",
      CTA: "Try it free",
      COMPOSITION: "subject on the left, text stacked on the right",
      STYLE: "clean editorial, high contrast, one accent color",
      FORMAT: "4:5 portrait",
    },
    tags: ["social", "ad", "marketing", "campaign"],
    sort_order: 4,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "architecture-interior",
    slug: "architecture-interior",
    title: "Architecture / Interior",
    short_title: "Architecture",
    group: "Create",
    description:
      "Picture a room, building or space by describing its layout, materials, viewpoint and light.",
    best_for: "Interior concepts, building exteriors, spatial studies",
    compatibility: "general",
    fields: [
      { key: "SPACE", label: "Space or building", required: true },
      { key: "GEOMETRY", label: "Geometry and layout" },
      { key: "MATERIALS", label: "Materials" },
      { key: "VIEWPOINT", label: "Viewpoint" },
      { key: "LIGHTING", label: "Lighting" },
      { key: "ATMOSPHERE", label: "Atmosphere" },
      { key: "CHANGES", label: "Changes allowed", hint: "What may be reimagined" },
      { key: "PRESERVE", label: "Features to preserve" },
    ],
    template_prompt: `An architectural image of [SPACE].

Geometry and layout: [GEOMETRY]
Materials: [MATERIALS]
Viewpoint: [VIEWPOINT]
Lighting: [LIGHTING]
Atmosphere: [ATMOSPHERE]

May be reinterpreted: [CHANGES]
Must be preserved: [PRESERVE]

Keep proportions, sightlines and structural logic believable.`,
    example_input: {
      SPACE: "a compact city apartment living room",
      GEOMETRY: "open plan, one long wall of windows, low ceiling",
      MATERIALS: "pale oak floor, lime-plaster walls, brushed steel details",
      VIEWPOINT: "eye level from the doorway, one-point perspective",
      LIGHTING: "late afternoon daylight from the window wall",
      ATMOSPHERE: "warm, lived-in, uncluttered",
      CHANGES: "furniture layout and soft furnishings",
      PRESERVE: "window positions, ceiling height, room proportions",
    },
    tags: ["architecture", "interior", "space", "render"],
    sort_order: 5,
    active: true,
    updated_at: UPDATED,
  },

  // ------------------------------------------------------------- Structure
  {
    id: "infographic-explainer",
    slug: "infographic-explainer",
    title: "Infographic / Explainer",
    short_title: "Infographic",
    group: "Structure",
    description:
      "Explain a process or comparison as a clear graphic with exactly the steps and labels you need.",
    best_for: "Process explainers, comparison graphics, teaching visuals",
    compatibility: "general",
    fields: [
      { key: "TOPIC", label: "Topic", required: true },
      { key: "TITLE", label: "Exact title" },
      { key: "SECTION_COUNT", label: "Number of sections or steps" },
      { key: "SECTION_LABELS", label: "Section labels, in order", long: true },
      { key: "FACTS", label: "Supporting facts", long: true },
      { key: "HIERARCHY", label: "Hierarchy" },
      { key: "ICON_STYLE", label: "Icon or illustration direction" },
      { key: "PALETTE", label: "Palette" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a [FORMAT] infographic explaining [TOPIC].

Title, spelled exactly:
"[TITLE]"

Sections: [SECTION_COUNT], in this order, each labelled exactly:
[SECTION_LABELS]

Supporting detail for the sections:
[FACTS]

Hierarchy: [HIERARCHY]
Icons and illustration: [ICON_STYLE]
Color: [PALETTE]

Use only the labels and facts given. Do not invent extra sections, numbers or sources.`,
    example_input: {
      TOPIC: "how a support ticket gets resolved",
      TITLE: "From ticket to fix",
      SECTION_COUNT: "3",
      SECTION_LABELS: "01 Report · 02 Triage · 03 Resolve",
      FACTS:
        "Report: the customer describes the issue. Triage: severity and owner are assigned. Resolve: the fix ships and the customer is notified.",
      HIERARCHY: "title top, three numbered rows stacked below, thin rules between",
      ICON_STYLE: "flat two-color line icons, consistent stroke weight",
      PALETTE: "off-white background, near-black text, one indigo accent",
      FORMAT: "4:5 portrait",
    },
    tags: ["infographic", "explainer", "diagram", "text"],
    sort_order: 6,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "presentation-visual",
    slug: "presentation-visual",
    title: "Slide / Presentation Visual",
    short_title: "Slide",
    group: "Structure",
    description:
      "Make a slide visual or simple diagram that carries one point, with the title and labels you specify.",
    best_for: "Deck slides, simple diagrams, talk visuals",
    compatibility: "general",
    fields: [
      { key: "MESSAGE", label: "The slide's message", required: true },
      { key: "TITLE", label: "Exact title" },
      { key: "STRUCTURE", label: "Structure" },
      { key: "LABELS", label: "Labels, in order", long: true },
      { key: "METAPHOR", label: "Visual metaphor" },
      { key: "STYLE", label: "Presentation style" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a slide visual that makes one point: [MESSAGE].

Title, spelled exactly:
"[TITLE]"

Structure: [STRUCTURE]
Labels, spelled exactly and in this order: [LABELS]
Visual metaphor: [METAPHOR]
Style: [STYLE]
Format: [FORMAT]

Keep it readable when projected: few elements, large type, high contrast, generous margins.`,
    example_input: {
      MESSAGE: "most of the cost sits in one stage of the pipeline",
      TITLE: "Where the cost goes",
      STRUCTURE: "a left-to-right flow of four stages, the third visibly larger",
      LABELS: "Collect · Clean · Model · Serve",
      METAPHOR: "a pipe that widens sharply at one section",
      STYLE: "flat, minimal, monochrome with one accent",
      FORMAT: "16:9 landscape",
    },
    tags: ["presentation", "slide", "diagram", "business"],
    sort_order: 7,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "ui-app-concept",
    slug: "ui-app-concept",
    title: "UI / App Concept",
    short_title: "UI concept",
    group: "Structure",
    description:
      "Mock up an app screen or web page by describing what it shows, what the user does, and how it looks.",
    best_for: "Product screens, app concepts, dashboard mockups",
    compatibility: "general",
    fields: [
      { key: "PRODUCT", label: "Product", required: true },
      { key: "SCREEN_PURPOSE", label: "Screen or page purpose", required: true },
      { key: "USER_GOAL", label: "Primary user goal" },
      { key: "INFORMATION", label: "Information the screen must show", long: true },
      { key: "ACTIONS", label: "Primary actions" },
      { key: "HIERARCHY", label: "Hierarchy" },
      { key: "VISUAL_SYSTEM", label: "Visual-system direction" },
      { key: "DEVICE", label: "Device and format" },
    ],
    template_prompt: `Design a single interface screen for [PRODUCT].

Screen purpose: [SCREEN_PURPOSE]
Primary user goal: [USER_GOAL]

Information shown on screen:
[INFORMATION]

Primary actions, labelled exactly: [ACTIONS]
Layout hierarchy: [HIERARCHY]
Visual system: [VISUAL_SYSTEM]
Device and format: [DEVICE]

Show only the features listed. Do not invent extra menus, tabs or product functionality, and use real label text rather than placeholder filler.`,
    example_input: {
      PRODUCT: "a habit-tracking app",
      SCREEN_PURPOSE: "the daily home screen",
      USER_GOAL: "check off today's habits in a few taps",
      INFORMATION: "today's date, a streak count, five habit rows with checkboxes",
      ACTIONS: "Add habit",
      HIERARCHY:
        "date and streak at the top, habit list filling the middle, one button at the bottom",
      VISUAL_SYSTEM: "8pt grid, one sans typeface, off-white surface, single accent color",
      DEVICE: "phone screen, 9:19.5 portrait",
    },
    tags: ["ui", "app", "mockup", "product"],
    sort_order: 8,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "character-design-sheet",
    slug: "character-design-sheet",
    title: "Character Design Sheet",
    short_title: "Character sheet",
    group: "Structure",
    description:
      "Document a character with consistent front, side and back views, expressions and props on one sheet.",
    best_for: "Game and animation characters, illustration bibles",
    compatibility: "reference-recommended",
    fields: [
      { key: "CHARACTER", label: "Character", required: true },
      { key: "APPEARANCE", label: "Appearance", long: true },
      { key: "OUTFIT", label: "Outfit" },
      { key: "VIEWS", label: "Views required", hint: "Front, side, back, three-quarter" },
      { key: "EXPRESSIONS", label: "Expressions" },
      { key: "PROPS", label: "Props" },
      { key: "STYLE", label: "Visual style" },
      { key: "LAYOUT", label: "Sheet layout" },
    ],
    template_prompt: `A character design sheet for [CHARACTER].

Appearance: [APPEARANCE]
Outfit: [OUTFIT]
Views on the sheet: [VIEWS]
Expression row: [EXPRESSIONS]
Props: [PROPS]
Style: [STYLE]
Sheet layout: [LAYOUT]

The same character in every view: identical face, proportions, outfit and colors. Flat neutral background, even lighting, no scene.`,
    example_input: {
      CHARACTER: "a young mechanic who repairs weather balloons",
      APPEARANCE: "short curly hair, freckles, slight build, mid-twenties",
      OUTFIT: "patched canvas overalls, rolled sleeves, heavy boots, tool belt",
      VIEWS: "front, side and back, full body, same height",
      EXPRESSIONS: "neutral, focused, laughing",
      PROPS: "a brass wrench and a folded map",
      STYLE: "hand-drawn animation model sheet, clean line art with flat color",
      LAYOUT: "three full-body views in a row, expression heads underneath",
    },
    tags: ["character", "game", "animation", "consistency"],
    sort_order: 9,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "storyboard-multi-panel",
    slug: "storyboard-multi-panel",
    title: "Storyboard / Multi-Panel",
    short_title: "Storyboard",
    group: "Structure",
    description:
      "Plan a sequence of scenes while keeping the same characters, setting and visual style consistent from panel to panel.",
    best_for: "Shot planning, comics, sequential storytelling",
    compatibility: "reference-recommended",
    fields: [
      { key: "MOMENT", label: "Story moment", required: true },
      { key: "SUBJECT", label: "Recurring subject or character", long: true },
      { key: "PANEL_COUNT", label: "Panel count" },
      { key: "SEQUENCE", label: "Panel sequence", long: true },
      { key: "CAMERA", label: "Camera progression" },
      { key: "STYLE", label: "Visual style" },
      { key: "CONTINUITY", label: "Continuity requirements" },
      { key: "LAYOUT", label: "Layout" },
    ],
    template_prompt: `A [PANEL_COUNT]-panel storyboard of [MOMENT].

Recurring subject, identical in every panel: [SUBJECT]

Panels, in order:
[SEQUENCE]

Camera progression: [CAMERA]
Shared style: [STYLE]
Continuity: [CONTINUITY]
Layout: [LAYOUT]

Same character, wardrobe, lighting and palette across all panels.`,
    example_input: {
      MOMENT: "someone finally deciding to send the message",
      SUBJECT: "a woman in her thirties, short black hair, denim jacket, round glasses",
      PANEL_COUNT: "3",
      SEQUENCE:
        "1: wide, she walks into a sunlit cafe. 2: medium, she sits by the window, laptop open. 3: close-up on the screen with one short line of text.",
      CAMERA: "wide to medium to close-up",
      STYLE: "warm cinematic wash, soft directional light",
      CONTINUITY: "same jacket, same cafe, same time of day",
      LAYOUT: "three stacked panels on a portrait canvas, thin borders",
    },
    tags: ["storyboard", "sequence", "comic", "continuity"],
    sort_order: 10,
    active: true,
    updated_at: UPDATED,
  },

  // ------------------------------------------------------------------ Edit
  {
    id: "precise-image-edit",
    slug: "precise-image-edit",
    title: "Precise Image Edit",
    short_title: "Precise edit",
    group: "Edit",
    description:
      "Change one specific thing in an image you already have, and say what must stay exactly as it is.",
    best_for: "Targeted fixes, swaps and removals in an existing image",
    compatibility: "editing-required",
    fields: [
      { key: "SOURCE", label: "Source image" },
      { key: "CHANGE", label: "The exact change", required: true },
      { key: "REGION", label: "Target region or object" },
      { key: "PRESERVE", label: "What must stay unchanged", long: true },
      { key: "REPLACEMENT", label: "Replacement details", hint: "Optional" },
    ],
    template_prompt: `Edit the attached image: [SOURCE].

CHANGE:
[CHANGE] — affecting only [REGION].

PRESERVE:
[PRESERVE]

Replacement detail: [REPLACEMENT]

Make no other change. Keep the original framing, lighting, perspective, color and grain, and blend the edited area so the edge is invisible.`,
    example_input: {
      SOURCE: "a photo of a desk with a laptop and a green mug",
      CHANGE: "replace the green mug with a plain white ceramic one",
      REGION: "the mug only",
      PRESERVE: "the laptop, desk, papers, shadows, reflections and background",
      REPLACEMENT: "same size and position, matte white, no logo",
    },
    tags: ["edit", "inpainting", "preserve", "retouch"],
    sort_order: 11,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "style-transfer",
    slug: "style-transfer",
    title: "Style Transfer / Restyle",
    short_title: "Restyle",
    group: "Edit",
    description:
      "Turn an existing image into a different medium or style while keeping its content and layout.",
    best_for: "Medium changes, art-direction passes, illustration conversions",
    compatibility: "editing-required",
    fields: [
      { key: "SOURCE", label: "Source or reference" },
      { key: "TARGET_STYLE", label: "Target medium or style", required: true },
      { key: "KEEP_CONTENT", label: "Content that must remain", long: true },
      { key: "KEEP_STRUCTURE", label: "Structure that must remain" },
      { key: "COLOR", label: "Color and material treatment" },
      { key: "FINISH", label: "Desired finish" },
    ],
    template_prompt: `Restyle the attached image: [SOURCE].

Target medium: [TARGET_STYLE]

Keep the same content: [KEEP_CONTENT]
Keep the same structure: [KEEP_STRUCTURE]

Color and material treatment: [COLOR]
Finish: [FINISH]

Change only the visual language. Do not add, remove or rearrange subjects, and keep the original composition and proportions.`,
    example_input: {
      SOURCE: "a street photograph of a market stall",
      TARGET_STYLE: "hand-inked watercolor illustration",
      KEEP_CONTENT: "the stall, the vendor, the crates of fruit, the awning",
      KEEP_STRUCTURE: "the same camera angle, the same placement of every element",
      COLOR: "muted warm washes with visible paper texture",
      FINISH: "loose ink outlines, soft edges, no photographic detail",
    },
    tags: ["style", "restyle", "medium", "conversion"],
    sort_order: 12,
    active: true,
    updated_at: UPDATED,
  },

  // ------------------------------------------------------------ References
  {
    id: "reference-based-subject",
    slug: "reference-based-subject",
    title: "Reference-Based Subject",
    short_title: "Keep the subject",
    group: "References",
    description:
      "Keep a person, product or character recognizable from a reference photo while placing them in a new scene.",
    best_for: "Same face, same product, new scene",
    compatibility: "reference-recommended",
    fields: [
      { key: "REFERENCE", label: "Reference image" },
      { key: "ROLE", label: "Role of the reference", hint: "Identity, product, style, layout" },
      { key: "PRESERVE", label: "Characteristics to preserve", long: true },
      { key: "ENVIRONMENT", label: "New environment", required: true },
      { key: "STATE", label: "New clothing or state", hint: "Optional" },
      { key: "COMPOSITION", label: "Composition" },
      { key: "STYLE", label: "Visual direction" },
    ],
    template_prompt: `Use the attached image as a reference: [REFERENCE].

Use it only for: [ROLE]

Preserve exactly: [PRESERVE]

New scene: [ENVIRONMENT]
New state: [STATE]
Composition: [COMPOSITION]
Visual direction: [STYLE]

The subject must stay recognizably the same. Take nothing else from the reference — not its background, framing or lighting.`,
    example_input: {
      REFERENCE: "a photo of a specific person",
      ROLE: "identity only",
      PRESERVE: "face shape, features, hair, skin tone, apparent age",
      ENVIRONMENT: "a sunlit rooftop at the end of the day",
      STATE: "a light linen shirt instead of the original outfit",
      COMPOSITION: "three-quarter body, subject slightly off center",
      STYLE: "natural documentary photography",
    },
    tags: ["reference", "identity", "consistency", "subject"],
    sort_order: 13,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "multi-reference-composition",
    slug: "multi-reference-composition",
    title: "Multi-Reference Composition",
    short_title: "Multi-reference",
    group: "References",
    description:
      "Combine several reference images, telling the model what each one is for, into a single new image.",
    best_for: "Identity plus product plus style in one image",
    compatibility: "reference-recommended",
    fields: [
      { key: "IMAGE_1", label: "Image 1 role" },
      { key: "IMAGE_2", label: "Image 2 role" },
      { key: "IMAGE_3", label: "Image 3 role" },
      { key: "IMAGE_4", label: "Image 4 role", hint: "Optional" },
      { key: "SCENE", label: "Final scene", required: true },
      { key: "COMPOSITION", label: "Composition" },
      { key: "LIGHTING", label: "Lighting" },
      { key: "CONSTRAINTS", label: "Constraints", long: true },
    ],
    template_prompt: `Combine the attached references into one image.

Image 1 = [IMAGE_1]
Image 2 = [IMAGE_2]
Image 3 = [IMAGE_3]
Image 4 = [IMAGE_4]

Use each reference only for its assigned role.

Final scene: [SCENE]
Composition: [COMPOSITION]
Lighting: [LIGHTING]
Constraints: [CONSTRAINTS]

Do not blend the roles: take identity only from the identity reference, product only from the product reference, and style only from the style reference.`,
    example_input: {
      IMAGE_1: "the person's identity",
      IMAGE_2: "the product being held",
      IMAGE_3: "the color and lighting style",
      IMAGE_4: "not used",
      SCENE: "the person holding the product in a bright kitchen",
      COMPOSITION: "waist-up, product clearly visible in the lower third",
      LIGHTING: "soft daylight from a window behind the camera",
      CONSTRAINTS: "keep the product label unaltered, no added text",
    },
    tags: ["reference", "composition", "multi-image", "roles"],
    sort_order: 14,
    active: true,
    updated_at: UPDATED,
  },

  // ----------------------------------------------------------------- Brand
  {
    id: "logo-brand-merch",
    slug: "logo-brand-merch",
    title: "Logo / Brand → Merch",
    short_title: "Brand & merch",
    group: "Brand",
    description:
      "Create a logo or brand mark and see it applied to a real object like a bag, box or shirt.",
    best_for: "Logo concepts, merch mockups, brand-on-product shots",
    compatibility: "general",
    fields: [
      { key: "BRAND", label: "Brand name", required: true },
      { key: "WHAT_IT_DOES", label: "What the brand does" },
      { key: "PERSONALITY", label: "Brand personality" },
      { key: "MARK_TYPE", label: "Mark type", hint: "Wordmark, monogram, symbol, combination" },
      { key: "EXACT_TEXT", label: "Exact text" },
      { key: "STYLE", label: "Visual direction" },
      { key: "COLORS", label: "Colors" },
      { key: "APPLICATION", label: "Application or product" },
    ],
    template_prompt: `Design a brand mark for [BRAND], a business that [WHAT_IT_DOES].

Personality: [PERSONALITY]
Mark type: [MARK_TYPE]

Text in the mark, spelled exactly:
"[EXACT_TEXT]"

Visual direction: [STYLE]
Colors: [COLORS]

Show it applied to: [APPLICATION]

Keep the mark simple enough to read small, spell the text exactly, and keep it consistent everywhere it appears.`,
    example_input: {
      BRAND: "Northbound",
      WHAT_IT_DOES: "makes cold-weather cycling gear",
      PERSONALITY: "rugged, plain-spoken, technical",
      MARK_TYPE: "combination mark: a compass needle above a wordmark",
      EXACT_TEXT: "NORTHBOUND",
      STYLE: "geometric, single stroke weight, no gradients",
      COLORS: "near-black on natural canvas, one signal orange accent",
      APPLICATION: "a folded canvas musette bag on a workbench",
    },
    tags: ["logo", "brand", "merch", "wordmark"],
    sort_order: 15,
    active: true,
    updated_at: UPDATED,
  },

  // -------------------------------------------------------- Create (batch 2)
  {
    id: "youtube-thumbnail",
    slug: "youtube-thumbnail",
    title: "YouTube / Video Thumbnail",
    short_title: "Thumbnail",
    group: "Create",
    description:
      "Make a clickable video thumbnail with a clear face or subject, one short headline, and strong contrast.",
    best_for: "YouTube, Shorts, course and podcast video covers",
    compatibility: "general",
    fields: [
      { key: "TOPIC", label: "What the video is about", required: true },
      { key: "HEADLINE", label: "Exact headline on the thumbnail" },
      { key: "SUBJECT", label: "Main face or subject" },
      { key: "EXPRESSION", label: "Expression or gesture" },
      { key: "BACKGROUND", label: "Background" },
      { key: "STYLE", label: "Visual style" },
      { key: "FORMAT", label: "Format", hint: "Usually 16:9" },
    ],
    template_prompt: `Create a [FORMAT] video thumbnail about [TOPIC].

Exact headline on the image, spelled exactly:
"[HEADLINE]"

Main subject: [SUBJECT]
Expression or gesture: [EXPRESSION]
Background: [BACKGROUND]
Visual style: [STYLE]

Keep the headline large and readable at small sizes, high contrast, one clear focal point, and no extra text beyond what is written above.`,
    example_input: {
      TOPIC: "a beginner guide to home espresso",
      HEADLINE: "STOP WASTING BEANS",
      SUBJECT: "a barista holding a portafilter toward camera",
      EXPRESSION: "surprised, eyebrows raised, looking at camera",
      BACKGROUND: "blurred café counter with warm bokeh lights",
      STYLE: "bold YouTube thumbnail, saturated colors, thick outline on text",
      FORMAT: "16:9 landscape",
    },
    tags: ["youtube", "thumbnail", "video", "social"],
    sort_order: 16,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "book-cover",
    slug: "book-cover",
    title: "Book / Ebook Cover",
    short_title: "Book cover",
    group: "Create",
    description:
      "Design a book or ebook cover with exact title and author text, a clear genre look, and room for the spine area if needed.",
    best_for: "Novels, nonfiction, self-published ebooks, pitch mockups",
    compatibility: "general",
    fields: [
      { key: "TITLE", label: "Exact book title", required: true },
      { key: "AUTHOR", label: "Exact author name" },
      { key: "GENRE", label: "Genre or category", required: true },
      { key: "CONCEPT", label: "Cover concept or central image" },
      { key: "MOOD", label: "Mood" },
      { key: "PALETTE", label: "Palette" },
      { key: "FORMAT", label: "Format", hint: "Usually portrait, e.g. 2:3" },
    ],
    template_prompt: `Design a [FORMAT] book cover for a [GENRE] book.

Exact title, spelled exactly:
"[TITLE]"

Exact author name, spelled exactly:
"[AUTHOR]"

Central visual concept: [CONCEPT]
Mood: [MOOD]
Palette: [PALETTE]

Keep the title dominant and fully legible, leave clean space for the typography, and do not invent extra subtitle or series text.`,
    example_input: {
      TITLE: "THE QUIET HARBOR",
      AUTHOR: "Mira Ellison",
      GENRE: "literary fiction",
      CONCEPT: "a small wooden boat tied to a foggy pier at dawn",
      MOOD: "hushed, melancholic, hopeful",
      PALETTE: "slate blue, soft fog gray, one warm lantern amber",
      FORMAT: "2:3 portrait",
    },
    tags: ["book", "ebook", "cover", "typography"],
    sort_order: 17,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "album-podcast-cover",
    slug: "album-podcast-cover",
    title: "Album / Podcast Cover",
    short_title: "Album cover",
    group: "Create",
    description:
      "Make a square cover for an album, single or podcast episode with exact title text and a strong graphic identity.",
    best_for: "Spotify/Apple covers, singles, podcast episode art",
    compatibility: "general",
    fields: [
      { key: "SHOW_OR_ALBUM", label: "Album, show or episode name", required: true },
      { key: "ARTIST", label: "Artist or host name" },
      { key: "EXACT_TEXT", label: "Exact text on the cover" },
      { key: "CONCEPT", label: "Visual concept", required: true },
      { key: "STYLE", label: "Visual style" },
      { key: "PALETTE", label: "Palette" },
      { key: "FORMAT", label: "Format", hint: "Usually 1:1" },
    ],
    template_prompt: `Create a [FORMAT] cover for "[SHOW_OR_ALBUM]" by [ARTIST].

Exact text on the cover, spelled exactly:
"[EXACT_TEXT]"

Visual concept: [CONCEPT]
Style: [STYLE]
Palette: [PALETTE]

Keep it readable as a small square thumbnail, center the graphic idea, and do not add extra track lists or fake logos.`,
    example_input: {
      SHOW_OR_ALBUM: "Night Bus",
      ARTIST: "Juniper Line",
      EXACT_TEXT: "NIGHT BUS",
      CONCEPT: "an empty city bus glowing from inside on a rainy street",
      STYLE: "moody photo-illustration, soft grain",
      PALETTE: "deep teal, sodium orange, wet asphalt black",
      FORMAT: "1:1 square",
    },
    tags: ["album", "podcast", "cover", "music"],
    sort_order: 18,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "email-header",
    slug: "email-header",
    title: "Email / Newsletter Header",
    short_title: "Email header",
    group: "Create",
    description:
      "Make a wide banner image for an email or newsletter with optional exact headline and clear brand mood.",
    best_for: "Newsletter tops, promo emails, launch announcements",
    compatibility: "general",
    fields: [
      { key: "PURPOSE", label: "What the email is about", required: true },
      { key: "HEADLINE", label: "Exact headline (optional)" },
      { key: "VISUAL", label: "Main visual", required: true },
      { key: "BRAND_MOOD", label: "Brand mood" },
      { key: "PALETTE", label: "Palette" },
      { key: "FORMAT", label: "Format", hint: "Usually wide, e.g. 3:1 or 16:9" },
    ],
    template_prompt: `Create a [FORMAT] email header banner for [PURPOSE].

Exact headline if any, spelled exactly:
"[HEADLINE]"

Main visual: [VISUAL]
Brand mood: [BRAND_MOOD]
Palette: [PALETTE]

Keep the composition simple for a narrow banner, leave quiet space if text is present, and avoid tiny details that disappear when scaled down.`,
    example_input: {
      PURPOSE: "a spring sale email for a plant shop",
      HEADLINE: "SPRING RESTOCK",
      VISUAL: "three potted plants on a sunlit windowsill",
      BRAND_MOOD: "friendly, fresh, unfussy",
      PALETTE: "leaf green, cream, soft terracotta",
      FORMAT: "3:1 landscape banner",
    },
    tags: ["email", "newsletter", "banner", "marketing"],
    sort_order: 19,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "app-icon-set",
    slug: "app-icon-set",
    title: "App Icon Set",
    short_title: "App icons",
    group: "Create",
    description:
      "Design a simple app icon (and optional variants) that reads clearly at small sizes.",
    best_for: "iOS/Android icons, PWA icons, pitch decks",
    compatibility: "general",
    fields: [
      { key: "APP", label: "App name or purpose", required: true },
      { key: "SYMBOL", label: "Symbol or metaphor", required: true },
      { key: "STYLE", label: "Icon style" },
      { key: "COLORS", label: "Colors" },
      { key: "BACKGROUND", label: "Background shape or fill" },
      { key: "VARIANTS", label: "Variants to show", hint: "e.g. light, dark, monochrome" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Design a [FORMAT] app icon for [APP].

Symbol: [SYMBOL]
Style: [STYLE]
Colors: [COLORS]
Background: [BACKGROUND]
Variants to show on one sheet: [VARIANTS]

Keep the symbol bold and simple enough to read at 32px, no tiny text inside the icon, and no fake OS chrome unless asked.`,
    example_input: {
      APP: "a habit tracker called Streak",
      SYMBOL: "a single upward tick mark made of three rounded bars",
      STYLE: "flat geometric, soft corners, no gradients",
      COLORS: "white symbol on deep indigo",
      BACKGROUND: "rounded square",
      VARIANTS: "color, dark mode, monochrome",
      FORMAT: "1:1 square sheet",
    },
    tags: ["app", "icon", "mobile", "brand"],
    sort_order: 20,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "sticker-pack",
    slug: "sticker-pack",
    title: "Sticker / Emoji Pack",
    short_title: "Stickers",
    group: "Create",
    description:
      "Create a set of stickers or emoji-style characters with a consistent look on one sheet.",
    best_for: "Chat stickers, emoji packs, merch stickers",
    compatibility: "general",
    fields: [
      { key: "THEME", label: "Pack theme or character", required: true },
      { key: "COUNT", label: "How many stickers", required: true },
      { key: "EXPRESSIONS", label: "Expressions or poses", long: true },
      { key: "STYLE", label: "Art style" },
      { key: "OUTLINE", label: "Outline / cutline" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a [FORMAT] sticker sheet of [COUNT] stickers themed around [THEME].

Expressions or poses, one per sticker:
[EXPRESSIONS]

Art style: [STYLE]
Outline / cutline: [OUTLINE]

Keep each sticker readable alone, consistent character design across the set, and leave clear white space between stickers.`,
    example_input: {
      THEME: "a round orange cat named Mochi",
      COUNT: "six",
      EXPRESSIONS: "1 waving 2 laughing 3 sleepy 4 shocked 5 coffee cup 6 heart eyes",
      STYLE: "cute flat vector, soft shading, thick white die-cut outline",
      OUTLINE: "white sticker border around each character",
      FORMAT: "1:1 square sheet",
    },
    tags: ["sticker", "emoji", "character", "pack"],
    sort_order: 21,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "meme-reaction",
    slug: "meme-reaction",
    title: "Meme / Reaction Image",
    short_title: "Meme",
    group: "Create",
    description:
      "Make a simple reaction or meme image with optional exact caption text and a clear punchline visual.",
    best_for: "Reaction images, light memes, community posts",
    compatibility: "general",
    fields: [
      { key: "SETUP", label: "The joke or reaction", required: true },
      { key: "CAPTION", label: "Exact caption text" },
      { key: "SUBJECT", label: "Subject or character", required: true },
      { key: "STYLE", label: "Visual style" },
      { key: "FORMAT", label: "Format" },
      { key: "CONSTRAINTS", label: "What to avoid" },
    ],
    template_prompt: `Create a [FORMAT] meme or reaction image for: [SETUP].

Exact caption if any, spelled exactly:
"[CAPTION]"

Subject: [SUBJECT]
Style: [STYLE]
Avoid: [CONSTRAINTS]

Keep the idea instantly readable, one clear punchline, and do not add extra captions beyond what is written above.`,
    example_input: {
      SETUP: "the face you make when the build finally passes",
      CAPTION: "SHIP IT",
      SUBJECT: "a tired developer staring at a green checkmark on a laptop",
      STYLE: "casual photo-meme, high contrast, slightly compressed jpeg feel",
      FORMAT: "1:1 square",
      CONSTRAINTS: "no logos of real companies, no tiny unreadable UI text",
    },
    tags: ["meme", "reaction", "social", "humor"],
    sort_order: 22,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "before-after",
    slug: "before-after",
    title: "Before–After Comparison",
    short_title: "Before–after",
    group: "Create",
    description:
      "Show a clear before and after in one image — split, side-by-side or labeled panels.",
    best_for: "Renovation, retouch, product results, transformations",
    compatibility: "general",
    fields: [
      { key: "SUBJECT", label: "What is being compared", required: true },
      { key: "BEFORE", label: "Before state", required: true },
      { key: "AFTER", label: "After state", hint: "What changed" },
      { key: "LAYOUT", label: "Layout", hint: "Split, side-by-side, stacked" },
      { key: "LABELS", label: "Exact labels" },
      { key: "STYLE", label: "Visual style" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a [FORMAT] before-and-after comparison of [SUBJECT].

Before: [BEFORE]
After: [AFTER]
Layout: [LAYOUT]

Exact labels, spelled exactly:
"[LABELS]"

Style: [STYLE]

Keep both sides fair and comparable, spell labels exactly, and make the change obvious at a glance.`,
    example_input: {
      SUBJECT: "a small studio apartment living room",
      BEFORE: "cluttered, dim, beige walls, mismatched furniture",
      AFTER: "tidy, bright, soft white walls, one sofa and a plant",
      LAYOUT: "vertical split down the middle",
      LABELS: "BEFORE | AFTER",
      STYLE: "clean interior photo, same camera angle both sides",
      FORMAT: "4:5 portrait",
    },
    tags: ["before-after", "comparison", "transformation"],
    sort_order: 23,
    active: true,
    updated_at: UPDATED,
  },

  // ----------------------------------------------------- Commerce (batch 2)
  {
    id: "food-photography",
    slug: "food-photography",
    title: "Food / Recipe Photography",
    short_title: "Food",
    group: "Create",
    description:
      "Shoot a dish or ingredient scene with appetizing light, styling and optional recipe-card text.",
    best_for: "Recipe blogs, menus, cookbooks, food social posts",
    compatibility: "general",
    fields: [
      { key: "DISH", label: "Dish or food", required: true },
      { key: "STYLING", label: "Plating and props" },
      { key: "SURFACE", label: "Surface or table" },
      { key: "LIGHTING", label: "Lighting" },
      { key: "ANGLE", label: "Camera angle" },
      { key: "EXACT_TEXT", label: "Exact text on image (optional)" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `A food photograph of [DISH].

Plating and props: [STYLING]
Surface: [SURFACE]
Lighting: [LIGHTING]
Camera angle: [ANGLE]
Format: [FORMAT]

Exact text if any, spelled exactly:
"[EXACT_TEXT]"

Make the food look fresh and appetizing, keep textures believable, and do not invent brand labels on packaging.`,
    example_input: {
      DISH: "a bowl of creamy tomato soup with grilled cheese soldiers",
      STYLING: "matte ceramic bowl, linen napkin, one spoon, soft steam",
      SURFACE: "worn oak table",
      LIGHTING: "soft window light from the left, gentle shadow",
      ANGLE: "45-degree three-quarter view",
      EXACT_TEXT: "(no text on the image)",
      FORMAT: "4:5 portrait",
    },
    tags: ["food", "recipe", "editorial", "menu"],
    sort_order: 24,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "packaging-mockup",
    slug: "packaging-mockup",
    title: "Packaging Mockup",
    short_title: "Packaging",
    group: "Create",
    description:
      "Show a product package — box, bottle, pouch or can — with exact label text and realistic materials.",
    best_for: "CPG packaging concepts, label comps, shelf mockups",
    compatibility: "general",
    fields: [
      { key: "PACKAGE", label: "Package type and product", required: true },
      { key: "EXACT_TEXT", label: "Exact label text", required: true },
      { key: "MATERIALS", label: "Materials and finish" },
      { key: "SCENE", label: "Scene or surface" },
      { key: "ANGLE", label: "Camera angle" },
      { key: "LIGHTING", label: "Lighting" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a packaging mockup of [PACKAGE].

Exact label text, spelled exactly:
"[EXACT_TEXT]"

Materials and finish: [MATERIALS]
Scene: [SCENE]
Camera angle: [ANGLE]
Lighting: [LIGHTING]
Format: [FORMAT]

Keep the package geometry believable, spell every label word exactly, and do not invent extra claims or fake certifications.`,
    example_input: {
      PACKAGE: "a tall matte white coffee bag with a tin-tie top",
      EXACT_TEXT: "NORTH ROAST · HOUSE BLEND · 12 OZ",
      MATERIALS: "matte paper bag, soft touch, small kraft window",
      SCENE: "marble counter with a ceramic cup nearby",
      ANGLE: "three-quarter front, slightly above",
      LIGHTING: "soft daylight from camera-left",
      FORMAT: "4:5 portrait",
    },
    tags: ["packaging", "label", "cpg", "mockup"],
    sort_order: 25,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "fashion-lookbook",
    slug: "fashion-lookbook",
    title: "Fashion Lookbook Shot",
    short_title: "Lookbook",
    group: "Create",
    description:
      "Create a fashion or lookbook photo with clear outfit details, pose, setting and editorial mood.",
    best_for: "Lookbooks, apparel campaigns, style editorials",
    compatibility: "general",
    fields: [
      { key: "OUTFIT", label: "Outfit and garments", required: true, long: true },
      { key: "MODEL", label: "Model / subject" },
      { key: "POSE", label: "Pose" },
      { key: "SETTING", label: "Setting", required: true },
      { key: "LIGHTING", label: "Lighting" },
      { key: "MOOD", label: "Mood" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `A fashion lookbook photograph.

Outfit (keep garment details accurate): [OUTFIT]
Subject: [MODEL]
Pose: [POSE]
Setting: [SETTING]
Lighting: [LIGHTING]
Mood: [MOOD]
Format: [FORMAT]

Show the clothes clearly, keep fabric texture believable, and avoid inventing brand logos on the garments.`,
    example_input: {
      OUTFIT: "oversized olive trench, cream turtleneck, wide charcoal trousers, leather loafers",
      MODEL: "a young man with short black hair",
      POSE: "walking toward camera, one hand in pocket",
      SETTING: "quiet European street with pale stone buildings",
      LIGHTING: "overcast soft daylight",
      MOOD: "calm, tailored, modern",
      FORMAT: "3:4 portrait",
    },
    tags: ["fashion", "lookbook", "apparel", "editorial"],
    sort_order: 26,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "flat-lay",
    slug: "flat-lay",
    title: "Flat-Lay / Tabletop Scene",
    short_title: "Flat-lay",
    group: "Create",
    description:
      "Arrange objects from above for a flat-lay or tabletop still life — products, desk setups or styled collections.",
    best_for: "Product flat-lays, desk setups, gift guides, social still lifes",
    compatibility: "general",
    fields: [
      { key: "OBJECTS", label: "Objects in the scene", required: true, long: true },
      { key: "SURFACE", label: "Surface", required: true },
      { key: "ARRANGEMENT", label: "Arrangement" },
      { key: "LIGHTING", label: "Lighting" },
      { key: "MOOD", label: "Mood" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `A top-down flat-lay photograph.

Objects: [OBJECTS]
Surface: [SURFACE]
Arrangement: [ARRANGEMENT]
Lighting: [LIGHTING]
Mood: [MOOD]
Format: [FORMAT]

Keep the camera straight above the scene, even spacing, soft shadows, and no invented brand marks on the objects.`,
    example_input: {
      OBJECTS: "notebook, fountain pen, ceramic mug, small plant, wireless headphones",
      SURFACE: "light oak desk",
      ARRANGEMENT: "loose grid with breathing room, mug top-right",
      LIGHTING: "soft overhead daylight, gentle shadows",
      MOOD: "calm productivity",
      FORMAT: "1:1 square",
    },
    tags: ["flat-lay", "still-life", "product", "tabletop"],
    sort_order: 27,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "certificate-badge",
    slug: "certificate-badge",
    title: "Certificate / Badge",
    short_title: "Certificate",
    group: "Create",
    description:
      "Design a certificate, award or badge with exact names, dates and titles spelled correctly.",
    best_for: "Course certificates, awards, membership badges",
    compatibility: "general",
    fields: [
      { key: "TYPE", label: "Certificate or badge type", required: true },
      { key: "RECIPIENT", label: "Exact recipient name", required: true },
      { key: "TITLE_LINE", label: "Exact title or achievement" },
      { key: "ORG", label: "Issuing organization" },
      { key: "DATE", label: "Exact date text" },
      { key: "STYLE", label: "Visual style" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Design a [FORMAT] [TYPE].

Exact recipient name, spelled exactly:
"[RECIPIENT]"

Exact title or achievement, spelled exactly:
"[TITLE_LINE]"

Issued by: [ORG]
Date text, spelled exactly: "[DATE]"
Visual style: [STYLE]

Keep all text fully legible, spell every name and date exactly, and avoid fake seals of real governments or universities.`,
    example_input: {
      TYPE: "course completion certificate",
      RECIPIENT: "Alex Rivera",
      TITLE_LINE: "Completed Prompt Craft for Images",
      ORG: "Depikt Workshops",
      DATE: "September 12, 2026",
      STYLE: "clean modern certificate, thin border, minimal ornament",
      FORMAT: "4:3 landscape",
    },
    tags: ["certificate", "badge", "award", "typography"],
    sort_order: 28,
    active: true,
    updated_at: UPDATED,
  },

  // ----------------------------------------------- Structure / Brand (batch 2)
  {
    id: "map-diagram",
    slug: "map-diagram",
    title: "Map / Wayfinding Diagram",
    short_title: "Map",
    group: "Structure",
    description:
      "Make a simple map or wayfinding diagram with exact place labels and a clear path or regions.",
    best_for: "Event maps, campus guides, simple transit or venue diagrams",
    compatibility: "general",
    fields: [
      { key: "PURPOSE", label: "What the map is for", required: true },
      { key: "PLACES", label: "Places to label", required: true, long: true },
      { key: "PATH", label: "Route or highlight" },
      { key: "STYLE", label: "Map style" },
      { key: "PALETTE", label: "Palette" },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a [FORMAT] map diagram for [PURPOSE].

Places to show, with exact labels spelled exactly:
[PLACES]

Route or highlight: [PATH]
Style: [STYLE]
Palette: [PALETTE]

Keep labels readable, spell place names exactly, simplify geometry, and do not invent streets that contradict the listed places.`,
    example_input: {
      PURPOSE: "a weekend market site map",
      PLACES: "Entrance · Food Court · Crafts Row · Stage · Restrooms · Exit",
      PATH: "dashed visitor path from Entrance to Stage",
      STYLE: "flat illustrated map, friendly icons, no satellite realism",
      PALETTE: "cream paper, forest green paths, terracotta accents",
      FORMAT: "1:1 square",
    },
    tags: ["map", "diagram", "wayfinding", "infographic"],
    sort_order: 29,
    active: true,
    updated_at: UPDATED,
  },
  {
    id: "brand-moodboard",
    slug: "brand-moodboard",
    title: "Brand Moodboard / Style Tile",
    short_title: "Moodboard",
    group: "Brand",
    description:
      "Assemble a brand moodboard or style tile — colors, textures, type direction and reference imagery on one board.",
    best_for: "Brand kickoffs, pitch decks, creative direction",
    compatibility: "general",
    fields: [
      { key: "BRAND", label: "Brand or project", required: true },
      { key: "PERSONALITY", label: "Personality words", required: true },
      { key: "COLORS", label: "Color directions" },
      { key: "TEXTURES", label: "Textures and materials" },
      { key: "TYPE_FEEL", label: "Typography feel" },
      { key: "REFERENCES", label: "Image or scene references", long: true },
      { key: "FORMAT", label: "Format" },
    ],
    template_prompt: `Create a [FORMAT] brand moodboard for [BRAND].

Personality: [PERSONALITY]
Color directions: [COLORS]
Textures and materials: [TEXTURES]
Typography feel: [TYPE_FEEL]
Reference scenes or objects to include: [REFERENCES]

Arrange as a clean style tile or collage with labels, keep the direction cohesive, and do not invent real competitor logos.`,
    example_input: {
      BRAND: "a small ceramic homeware studio",
      PERSONALITY: "quiet, handmade, warm, precise",
      COLORS: "clay, oat, soft black, pale sage",
      TEXTURES: "unglazed ceramic, linen, raw wood",
      TYPE_FEEL: "simple grotesque sans, generous tracking",
      REFERENCES: "stacked bowls, kiln shelf, morning window light on a table",
      FORMAT: "16:9 landscape board",
    },
    tags: ["moodboard", "brand", "style-tile", "direction"],
    sort_order: 30,
    active: true,
    updated_at: UPDATED,
  },
];

export const activeTemplates = templates.filter((t) => t.active);

export function getTemplateBySlug(slug: string): Template | undefined {
  return templates.find((t) => t.slug === slug);
}

export function getTemplatesByGroup(group: TemplateGroup): Template[] {
  return activeTemplates
    .filter((t) => t.group === group)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Fill the model-neutral skeleton with whatever the user typed. Unfilled
 * placeholders fall back to a readable bracketed label so Build mode (and
 * the user) can see what is still missing instead of a raw key.
 */
export function buildTemplateStarter(
  template: Template,
  values: Record<string, string> = {},
): string {
  const labels = new Map(template.fields.map((f) => [f.key, f.label.toLowerCase()]));
  const body = template.template_prompt.replace(/\[([A-Z0-9_]+)\]/g, (match, key: string) => {
    const value = values[key]?.trim();
    if (value) return value;
    const label = labels.get(key);
    return label ? `[${label}]` : match;
  });
  return `Template: ${template.title}\n\n${body}`;
}
