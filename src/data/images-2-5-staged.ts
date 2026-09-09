/**
 * ChatGPT Images 2.5 collection — batch 1, STAGED.
 *
 * These 24 records live in the repo, not in the database, until the
 * generation/review phase promotes them. `fetchLibrary` merges only the
 * approved ones into the public library, so nothing here is visible to
 * users yet. Promotion path: generate → review → set status "approved"
 * (and gallery_ready once a reviewed result exists) → run the batch SQL
 * (scripts/export-staged-images-2-5.ts) → sync.
 *
 * Provenance rules (see research/images-2-5-community/):
 *   official_prompt     OpenAI published the prompt text. Used verbatim or
 *                       adapted; adaptations are called out in source_notes.
 *   official_inspired   OpenAI showed the output only. The prompt is ours.
 *   community_inspired  A public creator workflow suggested the pattern.
 *                       The prompt is ours; the creator is credited.
 *   depikt_original     Written from scratch.
 *
 * `setup_prompt` produces the source image for edit-type records so the
 * next phase can run them without hunting for photos. `reference_inputs`
 * lists what the tester must attach. `review` is the check-list for the
 * generation phase.
 */

import type { LibraryPrompt } from "@/types/library";
import type { ModelHint, PromptStatus, ReferenceMode, SourceType } from "@/lib/library-metadata";

export interface ReviewGuidance {
  /** What a pass looks like. */
  success: string;
  /** The most likely way it fails. */
  failure: string;
  /** The first thing to inspect. */
  check_first: string;
  /** Expected number of generation attempts before judging. */
  attempts: number;
  /** Which Images 2.5 API model to try first. */
  model_hint: ModelHint;
}

export interface StagedPrompt extends LibraryPrompt {
  slug: string;
  source: "curated";
  target_model: "gpt-image-2.5";
  tags: string[];
  source_type: SourceType;
  status: PromptStatus;
  generation_ready: boolean;
  gallery_ready: boolean;
  needs_reference_images: boolean;
  reference_mode: ReferenceMode;
  review_notes: string;
  result_count: number;
  created_at: string;
  updated_at: string;
  review: ReviewGuidance;
  /** Images the tester must attach, in order, when needs_reference_images is true. */
  reference_inputs?: string[];
  /** Generates the source image for an edit when no suitable photo is at hand. */
  setup_prompt?: string;
  // ---- filled by the generation/review phase ----
  /** Images 2.5 API model the approved result came from. */
  model_used?: "flare" | "sunburst";
  /** Generation attempts made before the decision. */
  attempts?: number;
  /** Synthetic fixture names under research/images-2-5-community/runs/_fixtures/. */
  fixtures_used?: string[];
  /** The staged prompt before revision, when `prompt` was rewritten during review. */
  original_staged_prompt?: string;
  /** What the review found; why the record was approved or held. */
  outcome_notes?: string;
}

const CREATED = "2026-09-09T18:00:00.000Z";
const OPENAI_LAUNCH = "https://openai.com/index/introducing-chatgpt-images-2-5/";

const base = {
  source: "curated" as const,
  target_model: "gpt-image-2.5" as const,
  gallery_ready: false,
  result_count: 0,
  created_at: CREATED,
  updated_at: CREATED,
};

export const stagedImages25Prompts: StagedPrompt[] = [
  // ============================================================
  // A. POSTERS / EDITORIAL / ART DIRECTION
  // ============================================================
  {
    ...base,
    id: "images25-showa-travel-poster-exact-title",
    slug: "showa-travel-poster-exact-title",
    title: "Showa Travel Poster with Exact Title",
    category: "Posters",
    user_input: "Vintage Japanese railway tourism poster for Kyoto with an exact title",
    prompt: `Create a vertical 3:4 travel poster for Kyoto in the style of a 1960s Japanese National Railways tourism advertisement.

Scene: the Yasaka Pagoda seen up a narrow stone lane at dusk, two stylised figures in kimono walking away from the viewer, a single lit paper lantern. Simplified architecture, bold geometric forms, strong silhouettes, clean perspective lines, generous sky.

Print treatment: flat printed colour fields, no digital gradients. Palette limited to deep navy, warm ivory paper, muted mustard and one vermilion accent. Add subtle paper grain, slight ink wear and a small misregistration offset so it reads as a screen print, not a photo with a filter.

Typography: reserve the bottom fifth as clean negative space. Set the title "KYOTO" in a wide bold sans, letter-spaced, in navy. Beneath it, smaller, the subtitle "京都へ、汽車で。" in vermilion. Text appears only in these two places; nothing else in the image carries lettering.`,
    why_it_works: `Names the era, the printing process and the palette instead of saying "vintage", so the model has concrete constraints to satisfy. The title and subtitle are quoted and given a reserved region, which is how Images 2.5 keeps text exact. Swap "Kyoto", the scene and the two strings for any destination.`,
    tags: ["poster", "travel", "vintage", "japanese", "typography", "exact-text", "screen-print"],
    source_type: "community_inspired",
    source_creator: "Saul Goodman (@Goodmanprotocol)",
    source_url: "https://x.com/Goodmanprotocol/status/2097542746273726753",
    source_notes:
      "The creator's 1,733-character Showa poster template established the direction (railway tourism aesthetic, navy/ivory/mustard/vermilion, print texture, reserved title space). This prompt is a Depikt rewrite with a concrete scene and quoted strings; none of the original text is reused.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Verify both strings render letter-perfect, including the Japanese subtitle, and that no stray lettering appears elsewhere. Check the print texture reads as flat ink, not a photo filter.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/showa-travel-poster-exact-title.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      'Pass on attempt 1 (Flare medium). "KYOTO" and the Japanese subtitle exact, bottom fifth clean, flat ink fields with grain and misregistration; no stray lettering.',
    review: {
      success:
        "Both strings exact, bottom fifth clean, flat colour fields with visible grain and slight misregistration, pagoda recognisable.",
      failure: "Extra signage text in the lane; gradients instead of flat fields; garbled kana.",
      check_first: "The subtitle glyphs.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-nine-poster-grid",
    slug: "nine-poster-grid",
    title: "3×3 Social Poster Grid",
    category: "Posters",
    user_input: "A 3-by-3 grid of mid-century posters, each with its own exact slogan",
    prompt: `One image, portrait 3:4: a 3×3 grid of nine separate mid-century modern posters on an off-white ground, with even gutters between them. Each poster is its own composition of flat geometric shapes and one bold slogan, set in a different display style per poster (wide grotesque, rounded bubble type, condensed capitals, stencil, and so on).

Palette across the whole grid: cobalt blue, tomato red, mustard yellow, pale pink, forest green and black on off-white. Exactly one poster may use a halftone photographic element (a single eye).

Slogans, one per poster, reading left to right, top to bottom, spelled exactly:
"WALK MORE"
"MAKE SOMETHING"
"GROW TOGETHER"
"LISTEN FIRST"
"REST WELL"
"DRINK WATER"
"LEARN DAILY"
"LOOK CLOSER"
"BE KIND"

Each slogan is the only text on its poster. Shapes stay simple: sun, stairs, overlapping circles, leaf, profile faces, arch. No borders around the grid, no captions.`,
    why_it_works: `Nine quoted strings in one frame is the hardest text test on the launch page. Fixing the reading order, the palette and one allowed photographic element keeps the nine posters coherent as a set while each keeps its own type style. Replace the slogans with a campaign's own lines.`,
    tags: ["poster", "grid", "mid-century", "typography", "exact-text", "geometric", "series"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's launch page shows a nine-poster grid (Travel Farther, CREATE, Grow Together, and others) with no prompt published. This is a Depikt reconstruction with its own slogans.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Count the posters (nine, even gutters) and read every slogan in order. Watch for a duplicated slogan or a merged cell.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/nine-poster-grid.webp",
    model_used: "sunburst",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium). Nine posters, nine exact slogans in order, one halftone eye, distinct type style per cell.",
    review: {
      success:
        "Nine distinct posters, nine exact slogans in the stated order, one halftone eye at most.",
      failure:
        "Slogan spelling drift on the longer strings; two cells sharing one shape system; text on the gutters.",
      check_first: "LISTEN FIRST and LEARN DAILY, the two most error-prone strings.",
      attempts: 3,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-sticker-pack-poster",
    slug: "sticker-pack-poster",
    title: "Sticker-Pack Poster",
    category: "Posters",
    user_input: "A vintage poster announcing a sticker pack, with a cat holding the sheet",
    prompt: `Vertical 2:3 poster on a flat royal-blue ground with a worn-paper finish: faint fold creases, a little edge wear, slightly soft ink.

Top: the headline "STICKER CLUB" in very large condensed bold sans, bright yellow, two lines. Below it, smaller, in white: "New pack: eight stickers". Above the headline, small, in yellow: "ステッカークラブ".

Centre: a black cat with yellow eyes sitting upright, photographic fur, holding a white sticker sheet in one paw and looking at the viewer. On the sheet, eight clearly separated die-cut stickers, each on its own: a speech bubble, a goldfish, a thumbs-up, a heart, a star, a small black cat face, a lightning bolt, a cloud. The sheet is tilted slightly toward the camera so every sticker is readable.

Down the left edge, small vertical Japanese copy in yellow: "はって、つたえよう。"

No other text anywhere. No logos.`,
    why_it_works: `Mixes three text elements in two scripts with a photographic subject and an illustrated product, which Images 2.5 is claimed to hold together. Every string is quoted, every sticker is named and separated, so a review can count what came back. Swap the club name and the eight sticker motifs.`,
    tags: ["poster", "sticker", "cat", "typography", "exact-text", "japanese", "product"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's launch page shows a 'ChatGPT Stickers / New sticker pack' poster with a black cat; no prompt published. This is a Depikt reconstruction with neutral branding.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Count eight stickers on the sheet and check all four strings, including the two Japanese lines. Photographic cat against flat graphic ground must not become a cartoon.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/sticker-pack-poster.webp",
    model_used: "sunburst",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium). All four strings exact including both Japanese lines; eight distinct stickers; photographic cat on flat ground.",
    review: {
      success:
        "Headline, subline and both Japanese strings exact; eight distinct stickers; photographic cat.",
      failure:
        "Sticker count wrong or stickers merged; kana garbled; cat rendered as illustration.",
      check_first: "The sticker sheet.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-national-park-stamp-sheet",
    slug: "national-park-stamp-sheet",
    title: "National Park Stamp Sheet",
    category: "Posters",
    user_input: "Eight vintage-style national park postage stamps in one sheet",
    prompt: `One image, landscape 3:2, on a black ground: eight postage stamps arranged in two rows of four with perforated edges and a thin cream border on each. Each stamp is a flat-colour illustration in a 1930s WPA travel-poster style with fine printed texture.

Each stamp carries three lines of type: the park name large in a serif at the top left, "NATIONAL PARK" small and letter-spaced beneath it, the state at the top right, and a tagline in small capitals on a dark band at the bottom. Text and scenes, in order:

1. "Yosemite" — "CALIFORNIA" — granite cliffs and a waterfall at sunrise — "GRANITE AND LIGHT"
2. "Olympic" — "WASHINGTON" — mossy rainforest with a river — "FOREST TO THE SEA"
3. "Arches" — "UTAH" — a red sandstone arch under stars — "STONE WINDOWS"
4. "Badlands" — "SOUTH DAKOTA" — striped buttes at dusk — "LAYERS OF TIME"
5. "Joshua Tree" — "CALIFORNIA" — Joshua trees and boulders at golden hour — "DESERT SILENCE"
6. "Shenandoah" — "VIRGINIA" — blue ridges in mist — "BLUE HORIZONS"
7. "Redwood" — "CALIFORNIA" — a road through giant trunks — "AMONG GIANTS"
8. "Crater Lake" — "OREGON" — deep blue lake with Wizard Island — "BLUE BEYOND BLUE"

Every stamp uses the same layout and type sizes. No other text, no denominations.`,
    why_it_works: `Eight structured units with distinct text each is a layout-plus-typography stress test. The shared template line and the numbered list give the model one system to repeat and eight facts to fill, which is easier to verify than free description. Swap parks, states and taglines for any collectible series.`,
    tags: ["poster", "stamps", "series", "vintage", "exact-text", "illustration", "travel"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's launch page shows eight vintage-style stamps (Yellowstone, Grand Canyon, Acadia, Zion, Glacier, Great Smoky Mountains, Denali, Everglades) with no prompt. This reconstruction uses a different set of parks.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Read all 24 strings. Check that the perforations and layout are identical across stamps and that no denomination or extra text was added.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/national-park-stamp-sheet.webp",
    model_used: "sunburst",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium). Eight stamps on one template, all 24 strings exact, no denominations.",
    review: {
      success: "Eight stamps, identical template, every name/state/tagline exact.",
      failure:
        "One stamp with two parks merged; taglines swapped between stamps; a '5c' denomination appearing.",
      check_first: "Stamps 5 to 8, where drift usually starts.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-historical-illustrated-poster",
    slug: "historical-illustrated-poster-silk-road",
    title: "Historical Illustrated Poster",
    category: "Posters",
    user_input:
      "Editorial historical poster with an exact heading and subheading, map above, scene below",
    prompt: `Vertical 3:4 editorial poster on aged parchment.

Heading, top centre, in a wide serif: "THE SILK ROAD". Directly beneath it, smaller, in small capitals: "CARAVANS OF THE TANG DYNASTY, 618–907". These are the only text elements.

Top half: an illustrated map from Chang'an westward through the Hexi Corridor, the Taklamakan's edge, Kashgar and Samarkand to Baghdad, drawn in ink with watercolour washes: route lines in vermilion, mountains in hatched sepia, oasis towns as small walled icons. No place names are lettered; the towns are marked only with icons.

Bottom half: a cinematic scene of a camel caravan leaving a walled oasis at first light, dust in the air, silk bales on the camels, watercolour and ink with realistic light and historically accurate Tang-era dress.

A thin ruled line separates map and scene. Museum-quality illustration, restrained palette of sepia, vermilion, indigo and parchment.`,
    why_it_works: `The GPT Image 2 version of this idea left the event as a placeholder and let the map label itself, which produced invented names. This version fixes the two strings, forbids labels on the map and describes the route by real places so the geography is checkable. Change the heading, subheading and route for another period.`,
    tags: ["poster", "history", "map", "editorial", "watercolor", "exact-text", "illustration"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_url: null,
    source_notes:
      "Images 2.5 rewrite of the legacy GPT Image 2 entry 'curated-historical-illustrated-poster'. The legacy entry is unchanged.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Confirm exactly two text elements. The map must carry no lettering. Check the caravan scene for anachronisms (saddles, dress).",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/historical-illustrated-poster-silk-road.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Flare medium). Two exact strings, unlettered map with an east-west route, coherent caravan scene.",
    review: {
      success:
        "Two exact strings, unlettered map with a plausible east-to-west route, coherent caravan scene.",
      failure: "Invented place names on the map; dates rendered wrong; a third caption appearing.",
      check_first: "Any text on the map.",
      attempts: 2,
      model_hint: "either",
    },
  },
  {
    ...base,
    id: "images25-architectural-minimalist-poster",
    slug: "architectural-minimalist-poster-pavilion",
    title: "Architectural Minimalist Poster",
    category: "Posters",
    user_input: "Clean architecture poster: one building, one giant word, small annotations",
    prompt: `Vertical 2:3 minimalist architecture poster, off-white ground. This is a flat graphic illustration, not a photograph or 3D render: no photographic lighting, no reflections, no gradients, no texture.

Subject: the Barcelona Pavilion (Mies van der Rohe, 1929) drawn in exactly three flat tones: travertine cream for the walls, roof slab and paving; deep viridian for the green-marble wall; a single thin grey line for the chrome columns and edges. Slight elevation view showing the flat roof plane, the reflecting pool as one flat pale-blue shape, and one free-standing wall.

Behind the building, one enormous word in a light-weight geometric sans, cropped by the left and right poster edges, in a grey only two steps darker than the ground: "PLANE".

Small annotations in a mono typeface, each placed near what it names with a thin leader line, in this exact wording: "roof plane, 1929" · "onyx and marble" · "eight cruciform columns" · "reflecting pool".

No other text. No frame, no logo, no date line.`,
    why_it_works: `A minimal constraint set (one building, one word, four quoted labels) leaves the model nothing to fill in except composition and negative space, which is where 2.5's layout control shows. The giant word sits behind the building so it can be cropped without hurting legibility. Swap the building, the word and the four labels.`,
    tags: [
      "poster",
      "architecture",
      "minimalist",
      "typography",
      "exact-text",
      "editorial",
      "template",
    ],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_url: null,
    source_notes:
      "Images 2.5 rewrite of the legacy GPT Image 2 entry 'curated-architectural-minimalist-poster'. The legacy entry is unchanged.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Check the pavilion is recognisable, the word PLANE is exact and cropped by the edges, and all four annotations are present and correctly placed.",
    result_count: 2,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/architectural-minimalist-poster-pavilion.webp",
    model_used: "flare",
    attempts: 2,
    original_staged_prompt: `Vertical 2:3 minimalist architecture poster, off-white ground.

Subject: the Barcelona Pavilion (Mies van der Rohe, 1929), drawn as a precise flat illustration in three tones: travertine cream, the green-marble wall in deep viridian, and the thin chrome columns in a single grey line. Slight elevation view showing the flat roof plane, the reflecting pool and one of the free-standing walls.

Behind the building, one enormous word in a light-weight geometric sans, cropped by the poster edges, in a grey only two steps darker than the ground: "PLANE".

Small annotations in a mono typeface, each placed near what it names, in this exact wording: "roof plane, 1929" · "onyx and marble" · "eight cruciform columns" · "reflecting pool".

No other text. No frame, no logo, no date line.`,
    outcome_notes:
      'Attempt 1 (Flare) rendered a photoreal pavilion despite "flat illustration"; prompt revised to state "flat graphic illustration, not a photograph or 3D render" and name the flat pool shape. Attempt 2 passes: three flat tones, PLANE cropped by the edges, four exact mono annotations with leader lines.',
    review: {
      success:
        "Recognisable pavilion, one giant word, four exact mono annotations, lots of clean ground.",
      failure:
        "Extra annotations; the giant word rendered fully inside the frame and dominating; a photographic render instead of flat illustration.",
      check_first: "The four annotations.",
      attempts: 2,
      model_hint: "either",
    },
  },

  // ============================================================
  // B. STRUCTURED VISUALS / INFOGRAPHICS / SLIDES
  // ============================================================
  {
    ...base,
    id: "images25-aurora-explainer-slide",
    slug: "aurora-explainer-slide",
    title: "Northern Lights Explainer Slide",
    category: "Visual Summaries",
    user_input: "Presentation slide explaining a science topic with a four-step icon diagram",
    prompt: `A single 16:9 presentation slide, dark navy background, with a photographic image of the aurora over a snowy ridge filling the right third and fading into the slide colour.

Top left, small letter-spaced label: "THE SUN'S ENERGY, SEEN FROM EARTH". Below it, the title in a large serif on two lines: "What Causes" / "the Northern Lights?" with the second line in a pale green.

Beneath the title, a short paragraph in a light sans: "Charged particles from the Sun are steered by Earth's magnetic field toward the poles, where they collide with gases in the upper atmosphere and make them glow."

Along the bottom, four steps in a row, each with a thin-line circular icon, a numbered caption in small capitals and one sentence beneath:
"1. SOLAR WIND" — "The Sun streams charged particles into space."
"2. MAGNETIC FIELD" — "Earth's field bends them toward the poles."
"3. COLLISION" — "Particles strike oxygen and nitrogen high above the ground."
"4. GLOW" — "Oxygen glows green and red; nitrogen adds blue and violet."

Thin arrows between the steps. Footer left: "small changes, a clearer sky". Footer right: "4". No other text.`,
    why_it_works: `Slide-ready visuals need real information laid out with a hierarchy, not decoration. Every string is quoted and every region is placed, so the model is composing, not inventing copy. The four-step icon row with arrows is the structure most explainer decks reuse. Swap the topic and the four steps.`,
    tags: ["slide", "explainer", "science", "infographic", "presentation", "exact-text", "layout"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's launch page shows a 'What Causes Solar Flares?' slide inside a Google Slides window; no prompt published. This reconstruction uses a different topic and its own copy.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Read the paragraph and all four captions and sentences. Check that icons are distinct and that the aurora photo does not sit under the text.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/aurora-explainer-slide.webp",
    model_used: "sunburst",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium). Title, paragraph, four captions and sentences, both footers exact; four distinct icons; photo confined to the right third.",
    review: {
      success:
        "Every string exact; four distinct icons with arrows; readable hierarchy; photo confined to the right.",
      failure: "The body paragraph paraphrased; captions merged; icons duplicated.",
      check_first: "The body paragraph, the longest string.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-three-step-rag-infographic",
    slug: "three-step-rag-infographic",
    title: "3-Step RAG Infographic",
    category: "Infographics",
    user_input: "Three-module flow diagram explaining retrieval-augmented generation",
    prompt: `Landscape 16:9 infographic on a white background, flat vector style, one accent colour (deep blue) plus grey, thin line icons.

Title, top left, medium weight sans: "How retrieval-augmented generation works". No subtitle.

Three rounded modules in a horizontal row, connected by two arrows pointing right. Each module has a number, a bold label and one line of caption, in this exact wording:

Module 1 — "1  Retrieve" — "Find the passages most similar to the question."
Icon: a magnifying glass over three stacked documents.

Module 2 — "2  Augment" — "Attach those passages to the prompt as context."
Icon: a document with a paperclip.

Module 3 — "3  Generate" — "The model answers using the attached context."
Icon: a speech bubble with a small sparkle.

Under the row, one grey line of text: "Answers stay grounded in your own documents." Even spacing, generous margins, no gradients, no shadows, no other text.`,
    why_it_works: `An exact three-module structure with quoted labels and captions tests layout discipline rather than style. The icons are described as simple line drawings so they cannot drift into illustration. Keep the shape and replace the three steps for any process diagram.`,
    tags: ["infographic", "diagram", "flow", "ai", "exact-text", "vector", "explainer"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_url: null,
    source_notes: "Written from scratch for the Images 2.5 collection.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Verify three modules, two arrows, exact labels and captions, and that no fourth element or gradient was added.",
    result_count: 1,
    gallery_ready: false,
    thumbnail_url: "/library/images-2-5/three-step-rag-infographic.webp",
    model_used: "sunburst",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium). Three modules, two arrows, exact labels and captions, one accent colour, no gradients. Gallery review: correct but visually plain; kept as a Library recipe, not a gallery image.",
    review: {
      success: "Three modules, exact text, three distinct icons, one accent colour.",
      failure: "A fourth box; captions rewritten; shadows or gradients.",
      check_first: "Module 2's caption.",
      attempts: 1,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-ticket-localization-edit",
    slug: "ticket-localization-edit",
    title: "Ticket Localization / Text Replacement",
    category: "Image Edits",
    user_input:
      "Swap the city, stamp and illustration on a designed ticket while locking everything else",
    prompt: `Edit the attached ticket image. Change only three things:

1. The city name printed on the stub, currently "TOKYO", becomes "LISBON" in the same typeface, size, colour and position.
2. The round postmark stamp beside it becomes a Lisbon stamp: the word "LISBON" around the ring and a small tram icon in the centre, in the same ink colour and size.
3. The illustration panel changes from the Tokyo scene to the Alfama district with the 25 de Abril bridge in the background at golden hour, in the same vintage screen-print style, palette and framing.

Keep exactly as they are: the hand, the ticket's shape and perforations, the barcode, the masthead text, the tagline, the sky, the lighting and the paper texture. No other text changes.`,
    why_it_works: `Three coordinated changes with an explicit lock list is the localization pattern Images 2.5 was demonstrated on. Quoting the old and new strings and naming the region by position removes ambiguity about what "the city" means. Swap the city, the stamp icon and the landmark scene.`,
    tags: ["image-edit", "text-swap", "localization", "ticket", "exact-text", "preserve", "layout"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's 'Multi-city ticket' reel cycles New Delhi, São Paulo, Tokyo, Paris and San Francisco on one locked ticket; no prompt published. The prompt is a Depikt reconstruction; the setup prompt produces a base ticket to edit.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: ["The base ticket image, generated with the setup prompt or supplied."],
    setup_prompt: `Photograph of a hand holding a vintage two-part travel ticket against a clear blue sky. The stub reads "TOKYO" in red condensed capitals with a round red postmark stamp beside it and a small barcode. The main panel shows a screen-print illustration of Tokyo at golden hour: Mount Fuji, the Skytree and a red pagoda with cherry blossom. Masthead across the panel: "IDEAS TRAVEL FURTHER". Perforated edge between stub and panel, cream paper with fine grain, soft daylight.`,
    review_notes:
      "Diff the edit against the base pixel by pixel outside the three regions: hand, perforations, barcode, masthead and sky must be unchanged. Confirm 'LISBON' twice and the tram icon.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/ticket-localization-edit.webp",
    model_used: "sunburst",
    attempts: 1,
    outcome_notes:
      'Pass on attempt 1 (Sunburst medium) on a generated Tokyo base ticket. "LISBON" twice, tram stamp, Alfama and bridge panel; hand, perforations, barcode, masthead and sky unchanged.',
    review: {
      success: "City, stamp and illustration changed; everything else identical; strings exact.",
      failure: "Masthead or tagline re-rendered; barcode redrawn; the hand's pose shifts.",
      check_first:
        "The barcode and masthead, the two things most likely to be silently re-rendered.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-multi-turn-infographic-edits",
    slug: "multi-turn-infographic-edits",
    title: "Multi-Turn Infographic Editing",
    category: "Infographics",
    user_input: "Five sequential text edits on one dense infographic, one change per turn",
    prompt: `Run these five edits as five separate turns on the attached infographic, feeding each result into the next. One change per turn; everything not named stays exactly as it is.

Turn 1: Change the big white title text at the top-left from "PORTO" to "PORTO WEEKEND".
Turn 2: Replace the red vertical badge text next to the title with "2 DAYS, 1 NIGHT".
Turn 3: In the top-right white info box, change the first line text to "Total time: 2 days, 1 night (about 36 hours)".
Turn 4: Change the blue section header on the right from "SUGGESTED ITINERARY (1.5 DAYS)" to "SUGGESTED ITINERARY (2 DAYS)".
Turn 5: Remove the purple "BUDGET PER PERSON" box at the bottom-right, including its bullet list and total.`,
    why_it_works: `These are OpenAI's own multi-turn edit instructions, translated onto an English infographic: each names the region by position and colour, quotes the old and the new string, and makes one change. That shape is what keeps earlier edits intact through later turns. Use it for any layout that needs a series of copy changes.`,
    tags: [
      "image-edit",
      "multi-turn",
      "infographic",
      "text-swap",
      "exact-text",
      "preserve",
      "layout",
    ],
    source_type: "official_prompt",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "Adapted. OpenAI's 'Travel infographic' reel shows five turns on a Chinese Yichang (宜昌) guide, captions verbatim in research/images-2-5-community/openai-announcement-inventory.md. The turn structure and wording are kept; the strings are translated onto an English infographic produced by the setup prompt.",
    status: "tested",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: ["The base infographic, generated with the setup prompt."],
    setup_prompt: `Vertical 2:3 travel infographic for Porto, dense but tidy, flat vector style with photos. Top-left, very large white title on a photo of the Dom Luís I bridge at dusk: "PORTO". Beside the title, a red vertical badge reading "1.5 DAY GUIDE". Top-right, a white info box with three lines: "Total time: 1.5 days (about 36 hours)" / "Best for: weekend trips" / "Start at the riverfront". Left column, green header "MUST-SEE SPOTS" with three photo cards: Ribeira, Livraria Lello, Clérigos Tower. Right column, blue header "SUGGESTED ITINERARY (1.5 DAYS)" with a timeline of six timed stops. Bottom-left, orange header "MUST-EAT" with four small dishes. Bottom-right, a purple box "BUDGET PER PERSON" with four bullet lines and a total "€120–180". Clean sans typography, generous padding.`,
    review_notes:
      "After turn 5, diff against the base: only the five named regions should differ. Check that turn 1's new title survives turns 2 to 5 and that removing the purple box leaves clean background, not a smear.",
    result_count: 2,
    gallery_ready: false,
    model_used: "sunburst",
    attempts: 2,
    outcome_notes:
      "Not approved. Both chains (Sunburst medium, then Sunburst high) applied all five edits correctly and cumulatively: title, badge, info line, section header, removed budget box, nothing else re-worded. But every chained turn re-encodes the whole image and after five turns the photos and small type are visibly softened, less at high quality but still obvious against the base. The prompt pattern is right; the model degrades on long chains. Re-test when a per-region edit or compositing step is available.",
    review: {
      success:
        "Five changes applied cumulatively; nothing else moved; final title still 'PORTO WEEKEND'.",
      failure:
        "A later turn reverting an earlier edit; the removed box leaving a ghost; unrelated captions re-rendered.",
      check_first: "Compare turn 5 output to the base outside the five regions.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },

  // ============================================================
  // C. PRECISE EDITS
  // ============================================================
  {
    ...base,
    id: "images25-change-outfit-only",
    slug: "change-outfit-only",
    title: "Change Outfit Only",
    category: "Image Edits",
    user_input: "Replace a person's clothing and change nothing else",
    prompt: `Edit the attached photo. Replace the clothing with a burgundy cable-knit sweater; make the knitted texture clearly visible.

Keep the person's face, hair, skin, pose, hands, trousers and shoes, the background, the framing and the lighting exactly as they are. Add no accessories.`,
    why_it_works: `The first sentence is one of OpenAI's own bounded edits: one change, one detail requirement. The second sentence is the preserve list that makes the edit reviewable. Short bounded edits are valid on Images 2.5 when the change is truly local; the preserve clause is there because clothing edits often pull the pose with them.`,
    tags: ["image-edit", "clothing", "preserve", "bounded-edit", "portrait"],
    source_type: "official_prompt",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "First sentence is OpenAI edit 003 from the 'Full-body edits' reel, verbatim (research/images-2-5-community/openai-100-edits.json). The preserve clause is Depikt's addition.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: ["A full-body portrait, generated with the setup prompt or supplied."],
    setup_prompt: `Full-body studio photograph of a woman standing facing the camera on a light grey seamless backdrop, charcoal crew-neck long-sleeve top, dark straight trousers, white sneakers, neutral expression, soft even lighting, 3:4.`,
    review_notes:
      "Overlay the result on the source: face, hands, trousers and shoe positions must align. The knit texture should be visible at full size.",
    result_count: 1,
    gallery_ready: false,
    thumbnail_url: "/library/images-2-5/change-outfit-only.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Flare medium). Burgundy cable knit with visible texture; face, hands, trousers, shoes, backdrop and framing aligned with the source. Gallery review: a neutral lookbook frame that only reads as an edit next to its source; Library recipe, not a gallery image.",
    review: {
      success: "Only the top changed; visible cable knit; everything else aligned.",
      failure: "Trousers re-coloured; pose or hand position shifts; face subtly regenerated.",
      check_first: "Hands and shoes.",
      attempts: 1,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-change-background-only",
    slug: "change-background-only",
    title: "Change Background Only",
    category: "Image Edits",
    user_input: "Replace the background behind a person and keep the person untouched",
    prompt: `Edit the attached photo. Replace the background with an empty nighttime street with soft cyan and magenta neon light, without readable signs.

Keep the person exactly as they are: face, hair, clothing, pose and position in the frame. Match the new scene's light to the person only with a subtle cyan and magenta rim on the edges; do not change skin tone or the clothing's colour.`,
    why_it_works: `OpenAI's background edit includes its own guard clause ("without readable signs"), which stops the model filling the street with invented text. The added match clause allows believable spill light while forbidding the usual side effect, a re-lit face. Swap the scene description for any backdrop.`,
    tags: ["image-edit", "background", "preserve", "bounded-edit", "neon", "portrait"],
    source_type: "official_prompt",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "First sentence is OpenAI edit 030 from the 'Full-body edits' reel, verbatim. The preserve and match clauses are Depikt's addition.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: ["A full-body portrait, generated with the setup prompt or supplied."],
    setup_prompt: `Full-body studio photograph of a woman standing facing the camera on a light grey seamless backdrop, charcoal crew-neck long-sleeve top, dark straight trousers, white sneakers, neutral expression, soft even lighting, 3:4.`,
    review_notes:
      "Check for any readable signage in the street. Compare skin tone and clothing colour to the source; only edge rim light should differ.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/change-background-only.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Flare medium). Empty neon street with no legible signs; person unchanged apart from a subtle cyan and magenta rim.",
    review: {
      success: "New street, no legible signs, person unchanged apart from a subtle rim.",
      failure:
        "Storefront text appears; the person's clothing takes on a magenta cast; feet no longer meet the ground plane.",
      check_first: "Signage.",
      attempts: 1,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-add-glasses-preserve-eyes",
    slug: "add-glasses-preserve-eyes",
    title: "Add Glasses While Preserving Eyes",
    category: "Image Edits",
    user_input: "Add eyeglasses to a portrait without changing the eyes or face",
    prompt: `Edit the attached photo. Add thin round metal eyeglasses with clear lenses; keep the eyes visible and undistorted.

Change nothing else: face, expression, hair, clothing, background and lighting stay exactly as they are. No reflections that hide the eyes.`,
    why_it_works: `An accessory addition is the smallest useful edit, and OpenAI's wording already carries the one clause that matters: the eyes stay visible and undistorted. The added line blocks the common failure of lenses that warp or reflect. Swap the frames' shape and material.`,
    tags: ["image-edit", "accessory", "glasses", "preserve", "bounded-edit", "portrait"],
    source_type: "official_prompt",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "First sentence is OpenAI edit 045 from the 'Full-body edits' reel, verbatim. The preserve clause is Depikt's addition.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: ["A portrait, generated with the setup prompt or supplied."],
    setup_prompt: `Head-and-shoulders studio portrait of a man in his thirties, short dark hair, light stubble, olive crew-neck sweater, looking at the camera with a slight smile, plain warm grey backdrop, soft key light from the left, 4:5.`,
    review_notes:
      "Zoom on the eyes: iris size and position must match the source, no lens magnification, no glare. Frames should sit on the nose bridge and ears plausibly.",
    result_count: 1,
    gallery_ready: false,
    thumbnail_url: "/library/images-2-5/add-glasses-preserve-eyes.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Flare medium). Thin round frames added, eyes identical in size and position, no glare, hair and expression unchanged. Gallery review: a generic headshot on its own; the edit is invisible without the before. Library recipe, not a gallery image.",
    review: {
      success: "Frames added, eyes identical to source, no glare.",
      failure:
        "Eyes enlarged or shifted behind the lenses; expression regenerated; hair reshaped around the temples.",
      check_first: "Iris size against the source.",
      attempts: 1,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-move-one-object",
    slug: "move-one-object-recompute-light",
    title: "Move One Object Position Only",
    category: "Image Edits",
    user_input: "Move a lamp to the other side of a room and let the light follow it",
    prompt: `Edit the attached photo. Move only the brass table lamp from the left side table to the empty right side table, keeping the lamp's size, shade and brass base identical. The potted plant and the coasters stay on the left side table exactly where they are; nothing else on either table changes.

Recompute the light: the warm pool of light, the shadows on the wall and the reflections on the sofa and floor must now come from the lamp's new position on the right, and the left side of the room is lit only by ambient light. Change nothing else: the sofa, cushions, throw, tables, wall, framed print, rug, window, camera angle and framing stay exactly as they are.`,
    why_it_works: `Higgsfield tested this with four words ("Move the lamp to the right") and reported that earlier models could not do it. The Depikt version keeps the edit narrow but says what "moving a lamp" implies physically, so the review can check the shadows and not just the lamp. Swap the object and the two positions.`,
    tags: ["image-edit", "object-move", "lighting", "preserve", "interior", "bounded-edit"],
    source_type: "community_inspired",
    source_creator: "Higgsfield AI (@higgsfield_ai)",
    source_url: "https://x.com/higgsfield_ai/status/2097515081802379736",
    source_notes:
      "Creator's prompt: 'Move the lamp to the right'. Depikt version names the source and destination and states the lighting consequences. The setup prompt produces a room to edit.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: [
      "A living-room photo with a lit lamp on the left side table, generated with the setup prompt or supplied.",
    ],
    setup_prompt: `Photograph of a calm living room at night: a grey linen sofa centred against a plain warm-white wall with one framed print above it, a small round wooden side table at each end of the sofa, a lit brass table lamp with a linen shade on the LEFT side table casting a warm pool of light up the wall and across the sofa arm, the right side table empty, a wool rug, 3:2, eye-level camera.`,
    review_notes:
      "Compare wall shadows and sofa highlights between source and result; they must flip sides. The left table must be empty and dimmer. Confirm the print, rug and framing did not move.",
    result_count: 2,
    gallery_ready: false,
    thumbnail_url: "/library/images-2-5/move-one-object-recompute-light.webp",
    model_used: "flare",
    attempts: 2,
    original_staged_prompt: `Edit the attached photo. Move the table lamp from the side table on the left of the sofa to the matching side table on the right of the sofa.

Recompute the light: the warm pool of light, the shadows on the wall and the reflections on the sofa and floor must now come from the lamp's new position, and the left side table should be lit only by the room's ambient light. Change nothing else: the sofa, tables, wall, artwork, rug, camera angle and framing stay exactly as they are.`,
    outcome_notes:
      "Attempt 1 (Flare) moved the lamp and recomputed the light correctly but carried the potted plant across with it. Prompt revised to state that the plant and coasters stay on the left table. Attempt 2 passes: lamp right, glow and shadows flipped, left table keeps plant and coasters, nothing else moved. Gallery review: dim interior whose point is the lighting change against the source; Library recipe, not a gallery image.",
    review: {
      success:
        "Lamp on the right, light and shadows follow, left table empty and dim, nothing else changed.",
      failure:
        "Two lamps; the lamp moves but the wall glow stays on the left; the sofa is re-rendered.",
      check_first: "The wall glow.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-product-scene-background-only",
    slug: "product-scene-background-only",
    title: "Change Product Scene Background Only",
    category: "Interior/Food/Fashion",
    user_input: "Change the backdrop and surface of a product shot without touching the product",
    prompt: `Edit the attached product photo. Change only the backdrop and the tabletop to pale sage green, both matte, with the same soft side lighting.

Keep the bottle exactly as it is: position, size, silhouette, matte blue finish, cap, label and any text on it. Keep the camera angle and the empty space above the bottle. The contact shadow under the bottle stays in place and takes on the new surface colour.`,
    why_it_works: `Product edits fail when the model politely "improves" the product. Naming the product's fixed attributes one by one, and saying what happens to the shadow, gives the review a checklist. Swap the colour and material of the backdrop; the preserve list stays.`,
    tags: ["image-edit", "product", "background", "preserve", "studio", "e-commerce"],
    source_type: "community_inspired",
    source_creator: "Flixly; God of Prompt (@godofprompt)",
    source_url: "https://www.flixly.ai/blog/gpt-image-2-5-flixly",
    source_notes:
      "Flixly's sample edit ('Change only the cream backdrop and tabletop to pale sage green. Keep the bottle's exact position, silhouette, blue finish…') and God of Prompt's product-campaign template (https://x.com/godofprompt/status/2097520160424993007) established the pattern. Rewritten by Depikt.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "product",
    reference_inputs: ["A product photo, generated with the setup prompt or supplied."],
    setup_prompt: `Studio product photograph: a matte blue water bottle with a black cap standing on a warm cream surface against a matching cream backdrop, soft side lighting from the left, gentle contact shadow, plenty of empty space above the bottle for a headline, 4:5.`,
    review_notes:
      "Overlay the bottle: outline, cap and label must align with the source. The shadow should be sage-tinted and in the same place. The headline space above must remain empty.",
    result_count: 1,
    gallery_ready: false,
    thumbnail_url: "/library/images-2-5/product-scene-background-only.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Flare medium). Sage backdrop and surface, bottle pixel-aligned with the source, contact shadow in place and sage-tinted, headline space still empty. Gallery review: clean but bland product frame; Library recipe, not a gallery image.",
    review: {
      success: "Sage backdrop and surface, bottle pixel-aligned, shadow in place.",
      failure:
        "Bottle re-rendered slightly larger; label text redrawn; a prop added on the surface.",
      check_first: "Bottle outline overlay.",
      attempts: 1,
      model_hint: "flare",
    },
  },

  // ============================================================
  // D. REFERENCE / MULTI-REFERENCE / LAYOUT
  // ============================================================
  {
    ...base,
    id: "images25-identity-clothing-merge",
    slug: "identity-clothing-merge",
    title: "Identity + Clothing Reference Merge",
    category: "Interior/Food/Fashion",
    user_input: "Dress the person from image 1 in the outfit from image 2",
    prompt: `Use image 1 as the identity reference: keep this exact person recognisably the same, including face, hair, skin tone, body shape and pose.

Use image 2 as the clothing reference only: take the jacket's cut, fabric, colour, seams and hardware from it. Ignore the person, pose and background in image 2.

Produce one photo of the person from image 1, in their original pose and setting, now wearing the jacket from image 2, fitted naturally to their body with correct drape and lighting. Do not change the face, hair, trousers, shoes, background or camera.`,
    why_it_works: `Numbering the inputs and giving each one a single role is OpenAI's own guidance for multi-image prompts, and it is exactly how Depikt's reference intents are written. Saying what to ignore in image 2 matters as much as what to take. Swap "jacket" for any garment.`,
    tags: ["reference", "multi-reference", "identity", "clothing", "fashion", "wardrobe-swap"],
    source_type: "community_inspired",
    source_creator: "God of Prompt (@godofprompt)",
    source_url: "https://x.com/godofprompt/status/2097520160424993007",
    source_notes:
      "Creator's template 11 ('Wardrobe swap: preserve identity… replace only [GARMENT] using image 2') and OpenAI's outfit example in the image-prompting guide established the pattern. Rewritten by Depikt.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "multi_reference",
    reference_inputs: [
      "Image 1: a full-body photo of a person (consented or generated).",
      "Image 2: a photo of a jacket, ideally on a mannequin or flat lay.",
    ],
    review_notes:
      "Blocked until two reference images are chosen. Then compare face and pose to image 1 and garment details to image 2; the jacket's hardware and seams are the tell.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/identity-clothing-merge.webp",
    model_used: "sunburst",
    attempts: 1,
    fixtures_used: ["portrait-full", "jacket-reference"],
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium) with synthetic fixtures. Same person and pose from image 1; bomber jacket from image 2 with sleeve pocket, brass zip and ribbed trims; T-shirt, jeans, sneakers and backdrop unchanged.",
    review: {
      success: "Same person and pose, jacket faithful to image 2 in cut and hardware.",
      failure:
        "The person from image 2 leaks in; the jacket is a generic version; the background changes.",
      check_first: "Jacket hardware and seams.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-product-style-ugc",
    slug: "product-style-reference-ugc",
    title: "Product + Style Reference UGC Shot",
    category: "Social Posts",
    user_input:
      "A creator-style photo holding my product, in the look of a separate reference photo",
    prompt: `Use image 1 as the product reference: the product must stay exactly as shown, including shape, proportions, colours, materials and label text.

Use image 2 as the style reference only: match its colour grading, light quality, grain, lens feel and casual framing. Do not copy its subject, its background or any object in it; the room, window, shelves, plants and furniture in image 2 must not appear.

Produce one vertical 4:5 photo that looks like a phone snapshot posted by a customer: a person in their twenties holding the product from image 1 at chest height, product label facing the camera and fully readable, natural smile, in a different, plain modern white kitchen with a marble counter and a window on the left, with the look and grade of image 2. No added text or logos.`,
    why_it_works: `Splitting "what" (the product) from "how it looks" (the style reference) mirrors the two-step workflow creators use, where the style is first described and then applied. Images 2.5 can take both images in one turn as long as each has one role. Swap the setting and the person description.`,
    tags: ["reference", "multi-reference", "product", "style", "ugc", "social", "photorealism"],
    source_type: "community_inspired",
    source_creator: "@Mho_23",
    source_url: "https://x.com/Mho_23/status/2097483045221917131",
    source_notes:
      "Creator's workflow: ask GPT-6 Astra for a JSON description of a reference photo's style, then 'Using this JSON as reference, generate a person holding my product.' Depikt version merges the two steps into one role-assigned prompt.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "multi_reference",
    reference_inputs: [
      "Image 1: a clean product photo with readable label.",
      "Image 2: a style reference photo (a candid with a distinct grade).",
    ],
    review_notes:
      "Blocked until the two references are chosen. Then check the label text against image 1 and the grade against image 2; the failure to watch is the product being redesigned.",
    result_count: 2,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/product-style-reference-ugc.webp",
    model_used: "sunburst",
    attempts: 2,
    fixtures_used: ["product-packshot", "style-reference"],
    original_staged_prompt: `Use image 1 as the product reference: the product must stay exactly as shown, including shape, proportions, colours, materials and label text.

Use image 2 as the style reference only: match its colour grading, light quality, grain, lens feel and casual framing. Do not copy its subject, product or background.

Produce one vertical 4:5 photo that looks like a phone snapshot posted by a customer: a person in their twenties holding the product from image 1 at chest height in a bright kitchen, product label facing the camera and fully readable, natural smile, the look and grade of image 2. No added text or logos.`,
    outcome_notes:
      "Attempt 1 (Sunburst) kept the can and matched the grade but reproduced the style reference's kitchen almost object for object. Prompt revised to forbid any object from image 2 and to name a different kitchen. Attempt 2 passes: label readable, grade and grain match, a different white kitchen.",
    review: {
      success:
        "Product identical and label readable; grade and grain match image 2; believable snapshot.",
      failure:
        "Label text altered; image 2's subject or background copied; studio look instead of snapshot.",
      check_first: "Label text.",
      attempts: 2,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-four-image-role-merge",
    slug: "four-image-role-merge",
    title: "Four-Image Role Merge",
    category: "Cinematic",
    user_input: "Combine identity, wardrobe, environment and composition from four separate images",
    prompt: `Four reference images, one role each:
Image 1 = identity. Keep this exact person: face, hair, skin tone, build.
Image 2 = wardrobe. Take only the outfit: garments, colours, fabrics, fit.
Image 3 = environment. Take only the location, time of day and light.
Image 4 = composition. Take only the framing, camera height, lens feel and where the subject sits in the frame.

Use each image only for its assigned role and ignore everything else in it. Combine them into one coherent photorealistic scene: the person from image 1, dressed as in image 2, standing in the place from image 3, framed as in image 4, with lighting that belongs to image 3. No text.`,
    why_it_works: `Four roles is the full version of OpenAI's "identify each input by number and purpose" rule. Listing what to ignore per image is what stops image 3's people or image 4's subject from leaking in. This is the recipe Depikt's multi-reference intent will grow into.`,
    tags: [
      "reference",
      "multi-reference",
      "identity",
      "wardrobe",
      "environment",
      "composition",
      "cinematic",
    ],
    source_type: "community_inspired",
    source_creator: "God of Prompt (@godofprompt)",
    source_url: "https://x.com/godofprompt/status/2097520160424993007",
    source_notes:
      "Creator's template 1: 'image 1 = identity. image 2 = clothing. image 3 = environment. image 4 = composition. use each image only for its assigned role.' Depikt version adds the per-image ignore rules and the lighting ownership.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "multi_reference",
    reference_inputs: [
      "Image 1: identity photo.",
      "Image 2: outfit photo.",
      "Image 3: location photo.",
      "Image 4: a photo with the desired framing.",
    ],
    review_notes:
      "Blocked until four references are chosen. Then check each role in turn; the usual leak is image 4's subject replacing image 1's person.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/four-image-role-merge.webp",
    model_used: "sunburst",
    attempts: 1,
    fixtures_used: [
      "portrait-full",
      "jacket-reference",
      "environment-forest-road",
      "composition-lowangle",
    ],
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium) with four synthetic fixtures. Person from image 1, jacket from image 2 (lining visible), misty forest road and dawn light from image 3, low wide framing with the subject in the left third from image 4.",
    review: {
      success:
        "Person from 1, outfit from 2, place and light from 3, framing from 4, one coherent photo.",
      failure:
        "Roles cross (image 2's person appears); light from image 4 instead of 3; a collage look.",
      check_first: "Whose face is in the frame.",
      attempts: 3,
      model_hint: "sunburst",
    },
  },
  {
    ...base,
    id: "images25-sketch-to-garden-plan",
    slug: "sketch-to-garden-plan-render",
    title: "Sketch to Garden-Plan Render",
    category: "Interior/Food/Fashion",
    user_input: "Turn a rough top-down garden sketch into a photoreal garden that keeps the layout",
    prompt: `Use the attached sketch as the layout guide only: it is a rough top-down plan of a garden. Follow its regions, positions and relative sizes exactly; do not inherit its line quality or colours.

Read the sketch as: a kidney-shaped swimming pool in the right half; a long rectangular dining table with chairs in the upper left; a row of three trees along the left edge; a curved path from the bottom edge to the pool; lawn everywhere else.

Render one photorealistic image of this garden seen from a slightly elevated eye-level camera at the bottom edge of the plan, late afternoon sun, Mediterranean planting (olive trees, lavender, terracotta), limestone paving around the pool, a striped umbrella over the table. Keep every element where the sketch puts it.`,
    why_it_works: `A sketch works on Images 2.5 as a spatial constraint, not a style reference, and the prompt has to say so. Restating the plan in words ("read the sketch as…") lets the model and the reviewer agree on what the blobs mean. Swap the planting and the camera position; keep the read-out.`,
    tags: ["sketch", "layout", "garden", "architecture", "photorealism", "reference"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's Sketch feature video turns a plan-view doodle (pool blob, table, trees) into a photoreal garden; no prompt published. This is a Depikt reconstruction that also names the regions in words.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "sketch",
    reference_inputs: [
      "A hand-drawn top-down garden plan matching the five regions described (draw it in ChatGPT's @Sketch or on paper).",
    ],
    review_notes:
      "Blocked until a sketch is drawn. Then check that the pool is right, the table upper-left, three trees on the left and the path from the bottom; the layout, not the rendering, is the test.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/sketch-to-garden-plan-render.webp",
    model_used: "sunburst",
    attempts: 1,
    fixtures_used: ["garden-plan-sketch"],
    outcome_notes:
      'Pass on attempt 1 (Sunburst medium) with a generated marker-sketch fixture. Pool right, table with umbrella upper-left, three trees on the left, gravel path from the bottom edge to the pool, lawn elsewhere; sketch line quality absent. Camera came out more elevated than "slightly elevated eye-level"; layout was the test.',
    review: {
      success:
        "All five regions where the sketch puts them; photoreal; sketch line quality absent.",
      failure:
        "Pool moved to the centre; trees become a hedge; the render inherits the sketch's marker look.",
      check_first: "Pool position.",
      attempts: 2,
      model_hint: "either",
    },
  },
  {
    ...base,
    id: "images25-recompose-aspect-ratio",
    slug: "recompose-to-new-aspect-ratio",
    title: "Recompose Exact Image to New Aspect Ratio",
    category: "Image Edits",
    user_input: "Reframe a square image to widescreen without cropping the subject",
    prompt: `Recompose the attached 1:1 image for 16:9 (1920×1088). Do not simply crop it. Treat this as an outpaint: the original image stays pixel-identical at the same scale in the centre of the frame, and only the new left and right margins are painted.

Extend the scene sideways with content that matches the original's perspective, light, colour and grain: more of the studio wall, window and shelving in the same style. Nothing that was visible may change or be lost; nothing new may compete with the subject. No text.`,
    why_it_works: `Images 2.5 accepts arbitrary sizes (any width and height divisible by 16, aspect between 1:3 and 3:1), so a reformat can name exact pixels. "Do not simply crop" plus "nothing visible may be lost" turns a vague resize into a checkable outpaint. Swap the target size for any placement.`,
    tags: ["image-edit", "recompose", "aspect-ratio", "outpaint", "preserve", "layout"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_url: null,
    source_notes:
      "Depikt original. God of Prompt's template 6 ('recompose this exact image for [ASPECT RATIO]. do not simply crop it') covers the same idea; the Depikt version adds the exact size and the loss and competition rules. The setup prompt produces a square source.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: ["A square source image, generated with the setup prompt or supplied."],
    setup_prompt: `Square 1:1 photograph: a ceramicist at a wheel in a bright studio, centred, hands on a half-formed bowl, shelves of glazed pots behind, morning window light from the left, fine film grain.`,
    review_notes:
      "Overlay the original on the centre of the result: subject scale and position must match. Inspect the extended margins for repeated pots or a seam.",
    result_count: 2,
    gallery_ready: false,
    thumbnail_url: "/library/images-2-5/recompose-to-new-aspect-ratio.webp",
    model_used: "sunburst",
    attempts: 2,
    original_staged_prompt: `Recompose the attached 1:1 image for 16:9 (1920×1088). Do not simply crop it.

Keep the subject at the same size and in the same pose, keep every existing element and the visual hierarchy, and extend the scene sideways with content that matches the original's perspective, light, colour and grain. Nothing that was visible may be lost; nothing new may compete with the subject. No text.`,
    outcome_notes:
      'Attempt 1 (Flare) kept the potter at the right scale but re-rendered the shelves and window. Escalated to Sunburst with the prompt reworded as an outpaint ("the original stays pixel-identical at the same scale in the centre"). Attempt 2 passes: centre matches the source, margins extend the studio without a seam.',
    review: {
      success:
        "Original content intact at the same scale; margins extend the studio plausibly; no seam.",
      failure:
        "Subject re-rendered smaller; the shelves repeat at the edges; a hard seam at the original boundary.",
      check_first: "Scale overlay.",
      attempts: 2,
      model_hint: "sunburst",
    },
  },

  // ============================================================
  // E. STYLE / ARTISTIC MEDIUM / TRANSFORMATIONS
  // ============================================================
  {
    ...base,
    id: "images25-80s-portrait-identity-lock",
    slug: "80s-portrait-identity-lock",
    title: "'80s Portrait Transformation",
    category: "Open-Ended Creative",
    user_input: "Show me what I would look like in the '80s, keeping my face",
    prompt: `Show me what I would look like if I was in the '80s.

Use the attached photo as the identity reference: keep this exact person recognisably the same, with the same face, eyes, skin tone and smile. Restyle everything else as a 1980s studio portrait: period hair, a colour-block windbreaker, a thin gold chain, a laser-grid backdrop in magenta and blue, soft flash lighting, and the faded colour and slight grain of a printed photo from the time. Square 1:1. No text.`,
    why_it_works: `The first line is OpenAI's own shared prompt, deliberately minimal. The rest is the identity lock and the period specification Depikt adds so the result can be judged: same face, listed period cues, print finish. Swap the decade and its cues.`,
    tags: ["style-transform", "portrait", "identity", "retro", "80s", "photorealism"],
    source_type: "official_prompt",
    source_creator: "OpenAI",
    source_url: "https://chatgpt.com/s/p_659f135ed2ec8191a208f4f16a769813",
    source_notes:
      "Adapted. OpenAI's shared prompt 'Neon 80s Portrait' is the first line, verbatim. The identity lock and period details are Depikt's addition.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "identity",
    reference_inputs: [
      "A clear photo of a consenting person's face (a team member, or a generated portrait from the change-outfit setup prompt).",
    ],
    review_notes:
      "Blocked until an identity photo is chosen. Then compare facial features to the source; the period styling is secondary to recognisability.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/80s-portrait-identity-lock.webp",
    model_used: "sunburst",
    attempts: 1,
    fixtures_used: ["portrait-full"],
    outcome_notes:
      "Pass on attempt 1 (Sunburst medium) with the synthetic portrait fixture. Clearly the same face; period hair, colour-block windbreaker, gold chain, laser backdrop and faded print finish present; no text.",
    review: {
      success:
        "Clearly the same person; hair, jacket, chain, laser backdrop and print finish present.",
      failure: "A generic '80s person; skin tone shifted by the grade; text or a date stamp added.",
      check_first: "Face against the source.",
      attempts: 2,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-watercolor-ink-fashion-illustration",
    slug: "watercolor-ink-fashion-illustration",
    title: "Watercolor / Ink Fashion Illustration",
    category: "Interior/Food/Fashion",
    user_input: "Turn an outfit photo into an editorial ink and watercolor fashion illustration",
    prompt: `Render the attached outfit photo as an editorial fashion illustration: confident hand-drawn ink contours, loose transparent watercolour washes that overshoot the lines, a few dry-brush strokes and paint spatters, on white paper with visible texture.

Keep the garment faithful: same silhouette, colours, fabric weight, pockets, buttons and hem lengths as the photo. Full-body figure in the same pose, stylised long proportions, the face reduced to a few ink marks. Drop the background entirely. No text.`,
    why_it_works: `A medium change is a whole-image render, so the prompt says what must survive it: the garment's construction. That is the Images 2.5 question worth testing, whether an attached outfit keeps its details through a loose illustration style. Swap the medium for gouache, marker or pencil.`,
    tags: ["style-transform", "fashion", "illustration", "watercolor", "ink", "editorial"],
    source_type: "community_inspired",
    source_creator: "Banana Prompts (@bananaprompts)",
    source_url: "https://x.com/bananaprompts/status/2097453650100547924",
    source_notes:
      "Creator's line: 'Fashion illustration of a person wearing [color] [outfit], full-body pose, … hand-drawn ink lines with loose watercolor and paint splashes, bold brush textures, white background…'. Depikt version works from an attached photo and adds the garment-fidelity clause.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: true,
    reference_mode: "edit_source",
    reference_inputs: ["A full-body outfit photo, generated with the setup prompt or supplied."],
    setup_prompt: `Full-body street-style photograph of a woman in a camel double-breasted wool coat with six buttons, a cream turtleneck, wide-leg charcoal trousers and black loafers, standing on a plain pale wall background, soft daylight, 3:4.`,
    review_notes:
      "Count the coat's buttons and check the trouser width and loafer shape against the photo. The washes should overshoot the lines; a tidy digital vector look is a fail.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/watercolor-ink-fashion-illustration.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      'Pass on attempt 1 (Flare medium). Six coat buttons, turtleneck, wide-leg trousers and loafers preserved from the source; loose washes overshoot the ink; white paper; no background. The shoulder bag in the result is in the source photo, so it is not an invention. Attempt 2 was run with an unnecessary "no bags" clause and is not used.',
    review: {
      success:
        "Garment details preserved; genuinely loose ink and wash; white paper; no background.",
      failure: "Buttons or pockets lost; the style becomes clean vector; the face fully rendered.",
      check_first: "Button count.",
      attempts: 2,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-impressionist-san-francisco",
    slug: "impressionist-san-francisco",
    title: "Impressionist San Francisco Scene",
    category: "Open-Ended Creative",
    user_input: "An impressionist oil painting of a San Francisco hill street toward the bay",
    prompt: `Impressionist oil painting, portrait 3:4: looking down a steep San Francisco street between pastel Victorian houses toward the bay, with the Golden Gate Bridge in the distance at the left and Coit Tower on its hill at the right. Bougainvillea on a wall in the foreground, a few parked cars, one white sailboat on the water.

Thick visible brushstrokes, broken colour, no hard outlines; a bright midday palette of cobalt, lilac, peach and olive with the bridge in vermilion. The sky is a flat field of strokes with no clouds. No text, no signature.`,
    why_it_works: `A recognisable place painted in a defined medium tests two things at once: landmark accuracy and style fidelity. Naming the brushwork and forbidding outlines keeps it from sliding into digital illustration. Swap the city and its two landmarks.`,
    tags: [
      "style-transform",
      "painting",
      "impressionist",
      "cityscape",
      "san-francisco",
      "landscape",
    ],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's launch page shows an impressionist San Francisco street scene with no prompt published. This is a Depikt reconstruction.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Check the bridge and Coit Tower are on the stated sides and that brushwork is visible at full size. A signature in the corner is a fail.",
    result_count: 2,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/impressionist-san-francisco.webp",
    model_used: "flare",
    attempts: 2,
    outcome_notes:
      "Attempt 1 (Flare) was strong but carried a small signature-like mark in the corner. Attempt 2 with the same prompt passes: bridge left, Coit Tower right, visible impasto, no outlines, no signature. Reproducible across both runs apart from the mark.",
    review: {
      success: "Both landmarks placed as stated, visible impasto, no outlines, no signature.",
      failure: "Landmarks swapped or duplicated; clean vector look; a painted signature.",
      check_first: "Landmark placement.",
      attempts: 1,
      model_hint: "flare",
    },
  },
  {
    ...base,
    id: "images25-mosaic-earth-and-stars",
    slug: "mosaic-earth-and-stars",
    title: "Mosaic Earth and Stars",
    category: "Open-Ended Creative",
    user_input: "A tile mosaic of Earth under a starry sky",
    prompt: `A tile mosaic, landscape 16:9, seen straight on: the curve of Earth fills the lower third with continents in green and ochre tesserae and oceans in three blues, cloud bands in white; above it a night sky of deep navy and cobalt tiles with gold eight-pointed stars, a ringed planet at the left, a spiral galaxy at the upper right and a small grey moon at the far right.

Every tile is an individual square or irregular piece of glass or stone with slight size variation, visible grout lines and small chips; light catches the gold tiles. No smooth gradients anywhere; all tone comes from tile colour. No text.`,
    why_it_works: `Material simulation is the test here: a mosaic only convinces when every tone is built from discrete tiles with grout, and the prompt says so twice. Placing each celestial element gives the review a map. Swap the subject; keep the tile rules.`,
    tags: ["style-transform", "mosaic", "illustration", "space", "material", "decorative"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI_LAUNCH,
    source_notes:
      "OpenAI's launch page shows a blue and gold mosaic of Earth beneath stars, planets and a spiral galaxy; no prompt published. This is a Depikt reconstruction.",
    status: "approved",
    generation_ready: true,
    needs_reference_images: false,
    reference_mode: "none",
    review_notes:
      "Zoom in: tones must be built from tiles with grout, not painted then textured. Confirm the planet, galaxy and moon positions.",
    result_count: 1,
    gallery_ready: true,
    thumbnail_url: "/library/images-2-5/mosaic-earth-and-stars.webp",
    model_used: "flare",
    attempts: 1,
    outcome_notes:
      "Pass on attempt 1 (Flare medium). Discrete tiles with grout across the whole frame including the sky; planet left, galaxy upper right, moon far right.",
    review: {
      success: "Discrete tiles everywhere, grout visible, elements where stated.",
      failure: "Smooth gradients in the sky; tiles only in the foreground; a planet duplicated.",
      check_first: "The sky at full zoom.",
      attempts: 1,
      model_hint: "sunburst",
    },
  },
];

/** Staged records that are approved and may appear in the public library. */
export function publicStagedPrompts(): StagedPrompt[] {
  return stagedImages25Prompts.filter((p) => p.status === "approved");
}
