/**
 * Batch 3 — 36 test-ready ChatGPT Images 2.5 recipes (2026-09-28).
 *
 * Researched from public sources after the September 9 audit, then written
 * here as original adaptations. Longer public templates were not copied.
 * These stay out of the public library until a reviewed result exists.
 *
 * Sources used as pattern leads, credited per record:
 *   OpenAI launch stills (make-the-bed)
 *   https://github.com/LaplaceYoung/awesome-gpt-image-2.5
 *   https://github.com/AtlasCloudAI/awesome-gpt-image-2.5-prompts
 *   https://carat.im/en/prompt-gallery/gpt-image-2-5
 *   https://zawa.ai/resources/gpt-image-2-5-prompts
 */

import type { ModelHint, ReferenceMode, SourceType } from "@/lib/library-metadata";
import type { StagedPrompt } from "./images-2-5-staged.ts";

const CREATED = "2026-09-28T18:00:00.000Z";
const OPENAI = "https://openai.com/index/introducing-chatgpt-images-2-5/";
const LAPLACE = "https://github.com/LaplaceYoung/awesome-gpt-image-2.5";
const ATLAS = "https://github.com/AtlasCloudAI/awesome-gpt-image-2.5-prompts";
const CARAT = "https://carat.im/en/prompt-gallery/gpt-image-2-5";
const ZAWA = "https://zawa.ai/resources/gpt-image-2-5-prompts";

interface ReviewGuidance {
  success: string;
  failure: string;
  check_first: string;
  attempts: number;
  model_hint: ModelHint;
}

interface RecipeInput {
  slug: string;
  title: string;
  category: string;
  user_input: string;
  prompt: string;
  why_it_works: string;
  tags: string[];
  source_type: SourceType;
  source_creator: string;
  source_url?: string;
  source_notes: string;
  reference_mode: ReferenceMode;
  reference_inputs?: string[];
  setup_prompt?: string;
  review_notes: string;
  review: ReviewGuidance;
}

function recipe(input: RecipeInput): StagedPrompt {
  const needs = input.reference_mode !== "none";
  return {
    source: "curated" as const,
    target_model: "gpt-image-2.5" as const,
    gallery_ready: false as const,
    result_count: 0,
    created_at: CREATED,
    updated_at: CREATED,
    status: "test_ready" as const,
    generation_ready: true as const,
    needs_reference_images: needs,
    id: `images25-${input.slug}`,
    ...input,
  };
}

export const batch3Images25Prompts: StagedPrompt[] = [
  recipe({
    slug: "make-the-bed-only",
    title: "Make the Bed Only",
    category: "Image Edits",
    user_input: "Tidy one unmade bed without touching the rest of the bedroom",
    prompt: `Edit the attached bedroom photo. Make the bed only.

Change: the bed is now neatly made. Duvet pulled smooth, pillows stacked at the head, no wrinkles that look slept-in. The bedspread color and pattern stay the same fabric.

Keep: the room, window light, floor, nightstands, lamps, and every object that is not the bedding. Do not move furniture, do not add plants or art, do not change the time of day.

The made bed should sit in the same position with contact shadows that match the existing light. No text.`,
    why_it_works: `OpenAI's launch still of a made bed is a one-object edit: the bedding changes state and the room is the control. Naming the fabric and forbidding new decor stops the model from "improving" the whole interior.`,
    tags: ["image-edit", "precise-edit", "interior", "preserve", "one-change"],
    source_type: "official_inspired",
    source_creator: "OpenAI",
    source_url: OPENAI,
    source_notes:
      "Inspired by the launch before/after of a messy bedroom becoming a made bed. OpenAI showed the stills; this prompt is ours.",
    reference_mode: "edit_source",
    reference_inputs: ["A bedroom photo with an unmade bed, generated with the setup prompt."],
    setup_prompt: `Photorealistic daytime photo of a small bedroom, shot from the doorway. An unmade double bed with a rumpled navy duvet and two white pillows askew. Oak nightstands, a brass lamp on the left, a paperback and a glass of water on the right, a window with sheer curtains, oak floor, one pair of slippers. Natural window light from the left. No people, no text.`,
    review_notes:
      "Diff the nightstands, lamp, book, glass, slippers, and window. Only the bedding should be tidy. Fabric color stays navy and white.",
    review: {
      success: "Bed is made; nightstands, lamp, book, glass, and slippers are unchanged.",
      failure: "The model redesigns the room, replaces the duvet, or adds decor.",
      check_first: "The brass lamp and the glass of water.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "remove-one-mug-fill",
    title: "Remove One Mug and Fill the Gap",
    category: "Image Edits",
    user_input: "Remove a single mug from a desk and rebuild the surface behind it",
    prompt: `Edit the attached desk photo. Remove the red mug and nothing else.

Change: the mug is gone. Rebuild the wood grain, the notebook edge, and the shadow that the mug was covering so the surface looks continuous.

Keep: the laptop, notebook, pencil, plant, and framing. Do not move those objects. Do not add a replacement cup, coaster, or stain.

Match the existing light. No text.`,
    why_it_works: `A removal fails when the model invents a new object or smears the hole. Naming the hidden surface (wood grain and the notebook edge) tells it what to reconstruct, and the ban on a replacement cup blocks the usual substitution.`,
    tags: ["image-edit", "object-removal", "inpaint", "preserve", "product"],
    source_type: "community_inspired",
    source_creator: "Zawa",
    source_url: ZAWA,
    source_notes:
      "Pattern from Zawa's 'remove an object' edit template (20 Sep 2026). The desk scene and wording are ours.",
    reference_mode: "edit_source",
    reference_inputs: ["A desk photo with one red mug, generated with the setup prompt."],
    setup_prompt: `Top-three-quarter photo of a pale oak desk. An open silver laptop on the left, a closed kraft notebook in the center with a red ceramic mug sitting on its right edge, a yellow pencil beside the notebook, a small pothos in a white pot at the back right. Soft daylight from the left. No people, no text, no logos.`,
    review_notes:
      "The red mug is absent. Laptop, notebook, pencil, and plant stay. The wood where the mug sat is continuous, not a blur patch.",
    review: {
      success: "Mug gone; other objects unmoved; wood grain continuous.",
      failure: "A new cup appears, the notebook moves, or the gap is a smear.",
      check_first: "The notebook's right edge where the mug used to sit.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "character-turnaround-sheet",
    title: "Character Turnaround Sheet",
    category: "Storyboards",
    user_input: "Front, side, and back of one character on a production sheet",
    prompt: `A character turnaround sheet, landscape, plain warm-grey background.

One adult character, the same person in all three views: short black hair with a silver streak at the left temple, a navy hooded jacket over a cream tee, dark trousers, white sneakers, a small round enamel pin on the left lapel. Neutral standing pose, arms relaxed, same height in every view.

Three full-body figures in a row, equal spacing, feet on one shared ground line:
Left, labeled "FRONT".
Center, labeled "SIDE", facing left.
Right, labeled "BACK".

Labels are small black sans-serif, centered under each figure, spelled exactly as quoted. A faint contact shadow under each pair of shoes. No other text, no props, no extra figures.`,
    why_it_works: `Turnaround sheets fail when each view becomes a different person. Locking hair, pin, and clothes once, then naming the three views and their exact labels, gives the model a continuity checklist instead of three portraits.`,
    tags: ["character-sheet", "turnaround", "exact-text", "consistency", "storyboard"],
    source_type: "community_inspired",
    source_creator: "Carat",
    source_url: CARAT,
    source_notes:
      "Pattern from Carat's three-view hooded character sheet and AtlasCloud multi-panel sheets. Costume, labels, and wording are ours.",
    reference_mode: "none",
    review_notes:
      "Same face, hair streak, pin, and outfit in FRONT, SIDE, and BACK. Labels spelled exactly. One ground line.",
    review: {
      success: "Three consistent views; labels FRONT, SIDE, BACK; pin on the left lapel in front.",
      failure: "The side or back view changes hair, height, or clothes; extra captions appear.",
      check_first: "The silver streak and the enamel pin across all three views.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "harbor-jazz-poster-billing",
    title: "Harbor Jazz Poster with Exact Billing",
    category: "Posters",
    user_input: "A vertical concert poster whose title, date, and venue are exact",
    prompt: `Vertical concert poster, 2:3.

Upper two-thirds: a saxophonist seen from behind, silver instrument catching a single warm spotlight, standing on a dark wooden pier. Background is a deep navy-to-plum gradient with fine film grain. Generous empty space above the figure.

Exact text, no other words:
Large cream serif title, lower third, centered: "HARBOR AFTER DARK"
Under it, smaller cream sans-serif, one line: "Saturday 21 March · 8:00 pm · Pier 4"

No logos, no ticket price, no extra lines. The date and venue must be spelled exactly as quoted.`,
    why_it_works: `Concert posters drift when the model invents a venue line. Quoting the title and the single billing line, and forbidding extra words, is the constraint that makes the type usable. The empty upper field keeps the title from colliding with the figure.`,
    tags: ["poster", "exact-text", "concert", "typography", "editorial"],
    source_type: "community_inspired",
    source_creator: "Carat",
    source_url: CARAT,
    source_notes:
      "Pattern from Carat's late-night jazz poster: silhouette, one title, one billing line. The event, pier, and copy are ours.",
    reference_mode: "none",
    review_notes:
      'Title is exactly "HARBOR AFTER DARK". Billing line matches, including the middle dot and "8:00 pm". No extra text.',
    review: {
      success: "Both quoted lines are spelled correctly and nothing else is written.",
      failure: "A fake venue, price, or second headline appears, or March is misspelled.",
      check_first: "The billing line, character by character.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "city-weather-card-numbers",
    title: "City Weather Card with Exact Numbers",
    category: "Visual Summaries",
    user_input: "A three-day weather card whose city and temperatures are exact",
    prompt: `A square weather card, flat editorial design, off-white paper background, hairline navy border.

Top, large navy serif: "LISBON"
Under it, small label: "3-DAY OUTLOOK"

Three equal columns. Each column has a simple weather icon, a day name, a high, and a low. Exact text:

Column 1: sun icon, "FRI", "22°", "14°"
Column 2: cloud icon, "SAT", "19°", "13°"
Column 3: rain icon, "SUN", "17°", "12°"

Day names are small caps. Temperatures are large. No city skyline, no extra days, no slogans, no degree word spelled out. Only the strings above.`,
    why_it_works: `Weather cards are a text-and-layout test: six numbers have to stay paired with the right day. Putting each day in its own column with the high above the low makes a wrong swap obvious.`,
    tags: ["infographic", "exact-text", "weather", "layout", "data"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported 'city weather forecast' case in LaplaceYoung/awesome-gpt-image-2.5. City, days, and numbers are ours.",
    reference_mode: "none",
    review_notes: "Lisbon, FRI 22/14, SAT 19/13, SUN 17/12. No fourth day. Degree symbols present.",
    review: {
      success: "Three columns, six temperatures matched to the quoted days.",
      failure: "A number swaps columns or a fourth day is invented.",
      check_first: "Sunday's high and low.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "field-notes-magazine-cover",
    title: "Field Notes Magazine Cover",
    category: "Posters",
    user_input: "A magazine cover with an exact masthead, issue date, and one cover line",
    prompt: `A portrait magazine cover.

Full-bleed photo: a person in a waxed olive jacket standing in tall grass at the edge of a pine forest, shot on a 50mm lens, overcast light, face turned three-quarters away so the face is not the subject.

Exact text only:
Masthead across the top in tall condensed cream serif: "FIELD NOTES"
Small line under the masthead, right aligned: "Issue 18 · October"
One cover line, lower left, cream sans-serif, two lines:
"The long walk
north of the city"

No barcode, no price, no additional cover lines, no celebrity name.`,
    why_it_works: `Magazine covers collect stray cover lines. Limiting the type to a masthead, an issue line, and one two-line story keeps the hierarchy testable. Turning the face away avoids an identity the prompt never specified.`,
    tags: ["magazine", "cover", "exact-text", "editorial", "portrait"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported fashion-magazine-cover case. Masthead, issue, and cover line are original.",
    reference_mode: "none",
    review_notes:
      'Masthead "FIELD NOTES", issue line "Issue 18 · October", cover line exactly two lines. No barcode.',
    review: {
      success: "Only the three quoted text blocks appear, correctly spelled.",
      failure: "A barcode, price, or extra cover line is added.",
      check_first: "The issue line and the two-line cover story.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "passport-stamp-page",
    title: "Passport Stamp Page",
    category: "Posters",
    user_input: "A passport page with six entry stamps and exact city names",
    prompt: `A close, straight-on photo of an open passport visa page, cream security paper with a faint guilloche pattern. Six ink entry stamps, slightly imperfect, not digitally perfect circles. Each stamp contains only the city name below, in capital letters, plus a small date. No other words.

Stamps, two rows of three:
"PORTO" 12 MAR
"LYON" 02 APR
"TRIESTE" 19 APR
"GDANSK" 07 MAY
"BERGEN" 21 MAY
"FARO" 03 JUN

Ink colors alternate navy and brick red. Stamps overlap the page lightly but do not cover each other's city names. No photographs of people, no coats of arms copied from a real country, no real passport numbers.`,
    why_it_works: `Stamp sheets fail when names melt into ornament. Giving each stamp one city and one date, and banning real emblems, keeps the page a typography test instead of a counterfeit document.`,
    tags: ["stamps", "exact-text", "print", "travel", "layout"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported passport-stamp case. Cities and dates are original, and the prompt forbids real emblems and numbers.",
    reference_mode: "none",
    review_notes:
      "Six city names readable: PORTO, LYON, TRIESTE, GDANSK, BERGEN, FARO. No real national emblems.",
    review: {
      success: "All six city names are spelled as quoted and paired with their dates.",
      failure: "A city is misspelled or a real coat of arms appears.",
      check_first: "GDANSK and TRIESTE.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "mechanical-pencil-cutaway",
    title: "Mechanical Pencil Cutaway",
    category: "Infographics",
    user_input: "An exploded diagram of a mechanical pencil with exact part labels",
    prompt: `A clean technical cutaway on a white background, landscape. A mechanical pencil split along its length, parts separated a few millimetres along the axis so the inside is visible. Graphite lead, clutch, spring, and eraser are distinguishable. Soft grey shading, no photoreal clutter.

Exact labels, small black sans-serif, each with a thin leader line:
"LEAD"
"CLUTCH"
"SPRING"
"BARREL"
"CLIP"
"ERASER"

Six labels only. No brand name, no measurements, no paragraph of copy. The pencil is matte black with a silver clip and a white eraser.`,
    why_it_works: `Cutaways grow fake annotations. Fixing the part count at six and quoting each label makes extra captions a failure, and the exploded gap is what makes the clutch and spring readable.`,
    tags: ["diagram", "cutaway", "exact-text", "product", "technical"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from glowing anatomical diagrams and public product-cutaway prompts. The pencil and six labels are ours.",
    reference_mode: "none",
    review_notes: "Exactly six labels, spelled as quoted, each touching the right part. No brand.",
    review: {
      success: "LEAD, CLUTCH, SPRING, BARREL, CLIP, ERASER are all present and correctly placed.",
      failure: "A seventh label or a brand word appears, or the spring is missing.",
      check_first: "The clutch and spring labels.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "weeknight-recipe-card",
    title: "Weeknight Recipe Card",
    category: "Visual Summaries",
    user_input: "A recipe card with an exact title, time, and four ingredients",
    prompt: `A portrait recipe card, warm off-white, letterpress feel. Left third is a photo of a bowl of tomato and white-bean stew with olive oil and herbs, shot from above. Right two-thirds are type.

Exact text only:
Title: "WEEKNIGHT STEW"
Meta line: "30 minutes · 2 servings"
Ingredients, one per line:
"1 onion"
"1 tin tomatoes"
"1 tin white beans"
"1 spoon olive oil"

No method steps, no website, no extra ingredients. A thin rule under the title. Black serif for the title, sans-serif for the list.`,
    why_it_works: `Recipe cards fail by inventing a method and extra ingredients. Stopping at four quoted lines and banning steps keeps the card checkable and still useful as a template.`,
    tags: ["recipe", "exact-text", "food", "card", "layout"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Written for the exact-text gap. Public infographic guides describe the structure; this card's copy is original.",
    reference_mode: "none",
    review_notes:
      'Title "WEEKNIGHT STEW", meta "30 minutes · 2 servings", and the four ingredient lines. No method.',
    review: {
      success: "Title, time, servings, and four ingredients match, with no extra steps.",
      failure: "A fifth ingredient or a numbered method appears.",
      check_first: "The ingredient list count.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "enamel-pin-sheet",
    title: "Enamel Pin Sheet",
    category: "Open-Ended Creative",
    user_input: "Six enamel pins of trail icons on one backing card",
    prompt: `A product photo of a backing card holding six hard-enamel pins, straight on, soft studio light, pale grey background.

The card is cream, with the exact title at the top in small navy serif: "TRAIL MARKERS"

Six pins in two rows of three, gold metal outline, glossy enamel:
a pine tree, a tent, a compass, a camp mug, a mountain, a boot.
Each pin is a simple icon, similar size, even spacing. No words on the pins. No other text on the card.`,
    why_it_works: `Pin sheets drift into stickers or lose the metal rim. Naming hard enamel, a gold outline, and six specific icons, plus one card title, separates this from the sticker-pack recipe already in the library.`,
    tags: ["product", "pins", "sheet", "exact-text", "merch"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported enamel-pin case. The trail set and card title are ours.",
    reference_mode: "none",
    review_notes:
      'Six pins, gold rims, title exactly "TRAIL MARKERS". Icons are tree, tent, compass, mug, mountain, boot.',
    review: {
      success: "Six distinct enamel pins and the one quoted title.",
      failure: "Pins become flat stickers, or words appear on the icons.",
      check_first: "The metal outline and the pin count.",
      attempts: 2,
      model_hint: "either",
    },
  }),

  recipe({
    slug: "double-exposure-portrait",
    title: "Double Exposure Portrait",
    category: "Open-Ended Creative",
    user_input: "Keep a person's profile and fill the silhouette with a pine forest",
    prompt: `Edit the attached portrait into a double exposure.

Keep: the person's profile silhouette, the direction they face, and the hair outline. The face stays recognisable as the same person where the two images overlap.

Change: inside the silhouette, a misty pine forest at dawn replaces the original background and fills the head and shoulders. Outside the silhouette the frame is clean off-white paper.

No second face, no text, no city skyline.`,
    why_it_works: `Double exposure loses the person when the forest replaces the profile. The prompt locks the silhouette and hair outline first, then limits the forest to the inside of that shape.`,
    tags: ["image-edit", "double-exposure", "identity", "portrait", "style"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported double-exposure case. The forest fill and silhouette lock are ours.",
    reference_mode: "identity",
    reference_inputs: ["A side-profile portrait, generated with the setup prompt."],
    setup_prompt: `Studio profile portrait of an adult facing left, neutral expression, hair tied back, charcoal sweater, plain light-grey background, soft side light. Head and shoulders. No text.`,
    review_notes:
      "Profile and hair outline match the source. Forest is inside the silhouette only. Background outside is off-white.",
    review: {
      success: "Same profile; forest contained in the silhouette; no second face.",
      failure: "The face is replaced or the forest spills outside the outline.",
      check_first: "The nose and hair outline against the source.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "crt-boot-screen",
    title: "CRT Boot Screen",
    category: "UI Mockups",
    user_input: "A curved CRT showing an exact four-line boot sequence",
    prompt: `A front-three-quarter photo of a beige 1980s CRT monitor on a desk, curved glass, scanlines, slight phosphor bloom. The screen shows only this monospace green text, left aligned, four lines:

"HARBOR OS 1.4"
"MEMORY OK"
"DISK OK"
"READY >"

No other lines, no logo, no window chrome. The desk is dim; the screen is the light source. A faint reflection of a room on the curved glass, not readable as text.`,
    why_it_works: `Fake terminals invent extra boot lines. A four-line allowlist, plus a physical monitor so the image is a photo of a screen rather than a flat UI, is a layout test the library does not already cover.`,
    tags: ["ui", "crt", "exact-text", "retro", "terminal"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported retro CRT boot-screen case. The four lines are original.",
    reference_mode: "none",
    review_notes:
      'Screen text is exactly the four lines "HARBOR OS 1.4", "MEMORY OK", "DISK OK", "READY >".',
    review: {
      success: "Four lines only, spelled as quoted, on a curved CRT.",
      failure: "A fifth line, a logo, or a flat modern window appears.",
      check_first: "The READY prompt and the line count.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "popup-book-spread",
    title: "Pop-up Book Spread",
    category: "Storyboards",
    user_input: "An open paper-engineered book with one standing paper boat",
    prompt: `A straight-on photo of an open children's pop-up book on a table, both pages visible.

The paper engineering: one white paper boat stands up from the gutter, folded card, visible tabs. Behind it, layered paper waves in two shades of blue. The left page is mostly empty cream paper. The right page has one line of type only, small black serif, centered in the lower third:

"The boat knew the way home."

No other sentences. Soft daylight, shallow depth, the pop-up in focus. No people, no printed illustrations besides the paper boat and waves.`,
    why_it_works: `Pop-up spreads fail when the model prints a flat illustration instead of a standing fold. Asking for visible tabs and one quoted sentence separates the paper structure from the type.`,
    tags: ["paper", "popup", "book", "exact-text", "product"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported folded paper-sculpture picture-book case. The boat and sentence are ours.",
    reference_mode: "none",
    review_notes:
      'A standing paper boat with tabs. The only sentence is "The boat knew the way home."',
    review: {
      success: "The boat stands off the page and the quoted line is the only text.",
      failure: "The spread is a flat drawing, or a second sentence appears.",
      check_first: "The fold tabs at the gutter.",
      attempts: 2,
      model_hint: "either",
    },
  }),

  recipe({
    slug: "keycap-harbor-diorama",
    title: "Keycap Harbor Diorama",
    category: "Open-Ended Creative",
    user_input: "A miniature harbor built inside one oversized keyboard keycap",
    prompt: `A macro product photo of a single oversized mechanical-keyboard keycap, translucent smoked plastic, sitting on a dark desk. Inside the keycap is a miniature harbor: a tiny pier, two boats, and a lighthouse, all in scale with each other. Shallow depth of field, the keycap legend sharp.

The legend on the top of the keycap is the exact characters "H1" in a simple sans-serif, molded into the plastic, no other letters.

Soft side light, a small reflection on the desk. No giant fingers, no extra keycaps.`,
    why_it_works: `Diorama keycaps lose the keyboard object and become a random miniature. Locking one cap, one legend, and three harbor pieces keeps scale and type checkable.`,
    tags: ["diorama", "product", "macro", "exact-text", "miniature"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported branded-keycap and ESC-keycap diorama cases. The harbor and H1 legend are ours.",
    reference_mode: "none",
    review_notes:
      'One keycap, legend exactly "H1", harbor contains pier, two boats, and a lighthouse.',
    review: {
      success: "One cap, readable H1, three harbor elements in a consistent scale.",
      failure: "Extra keycaps, extra letters, or a full-size harbor.",
      check_first: "The H1 legend and the keycap count.",
      attempts: 2,
      model_hint: "either",
    },
  }),

  recipe({
    slug: "botanical-plate-rosemary",
    title: "Botanical Plate of Rosemary",
    category: "Infographics",
    user_input: "A scientific plant plate with exact part labels",
    prompt: `A botanical plate on warm white paper, portrait, fine ink and restrained watercolor, in the manner of a 19th-century herbarium sheet but with original drawing, not a copy of a known plate.

One rosemary sprig, full stem, with a separate detail of a flower cluster and a separate detail of a leaf underside.

Exact labels, small serif, with hairline leaders:
"STEM"
"LEAF"
"FLOWER"
"CALYX"

Caption centered at the bottom: "ROSEMARY"
No Latin name, no paragraph, no signature, no institution.`,
    why_it_works: `Scientific plates invent Latin and a paragraph of fake notes. Four part labels plus one common-name caption is enough to test leaders and spelling without fake taxonomy.`,
    tags: ["botanical", "diagram", "exact-text", "scientific", "illustration"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Written for the labeled-diagram gap. Public cutaway prompts suggested the leader-line structure; the plate is original.",
    reference_mode: "none",
    review_notes:
      'Labels STEM, LEAF, FLOWER, CALYX, and the caption "ROSEMARY". No Latin binomial.',
    review: {
      success: "Four labels and the one caption, each leader touching the right part.",
      failure: "A Latin name or a paragraph of notes appears.",
      check_first: "The caption and the calyx leader.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "harbor-line-transit-map",
    title: "Harbor Line Transit Map",
    category: "Infographics",
    user_input: "A one-line transit map with six exact station names",
    prompt: `A schematic transit map, landscape, white background. One route only, a thick navy line with a simple curve, not a geographic coastline.

Six stations as white dots with navy rings, in this order from left to right. Exact names, small sans-serif, alternating above and below the line so they do not collide:

"PIER"
"MARKET"
"HILL"
"ARCHIVE"
"GARDEN"
"TERMINUS"

Title at the top left: "HARBOR LINE"
No other routes, no fare, no legend, no real city names.`,
    why_it_works: `Transit maps fail by adding lines and real geography. One route and six quoted stations in a fixed order is a layout test, and alternating the labels is what keeps them readable.`,
    tags: ["map", "transit", "exact-text", "diagram", "layout"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Written for the schematic-map gap. Station names are fictional so the recipe does not redraw a real system.",
    reference_mode: "none",
    review_notes:
      'Title "HARBOR LINE". Stations left to right: PIER, MARKET, HILL, ARCHIVE, GARDEN, TERMINUS.',
    review: {
      success: "One line, six names in that order, no second route.",
      failure: "A station is renamed, reordered, or a second line appears.",
      check_first: "ARCHIVE and TERMINUS spelling and order.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "bar-menu-three-drinks",
    title: "Bar Menu with Three Drinks",
    category: "Visual Summaries",
    user_input: "A narrow menu listing three drinks with exact names and prices",
    prompt: `A narrow portrait menu card, deep green paper, cream type, photographed flat with a soft shadow.

Exact text only:
Header: "TONIGHT"
Then three drinks, name on the left, price on the right, hairline between them:

"House highball"    "8"
"Citrus spritz"     "9"
"Cold brew"         "4"

No ingredients, no address, no logo. Prices are the digits shown, with no currency symbol added.`,
    why_it_works: `Menus grow ingredients and a fourth item. Three quoted rows with prices pinned to the right is a small hierarchy test, and banning a currency symbol stops a silent rewrite of the price.`,
    tags: ["menu", "exact-text", "food", "print", "layout"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Original menu written for the exact-price gap. Not taken from a bar's real menu.",
    reference_mode: "none",
    review_notes: 'Header "TONIGHT". Three drinks and prices 8, 9, and 4. No currency symbol.',
    review: {
      success: "Three rows, prices 8, 9, 4, no extra items.",
      failure: "A currency mark, a fourth drink, or ingredient copy appears.",
      check_first: "The three prices.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "duotone-studio-portrait",
    title: "Duotone Studio Portrait",
    category: "Interior/Food/Fashion",
    user_input: "Recolor a studio portrait into navy and cream without changing the person",
    prompt: `Edit the attached studio portrait into a two-color fashion image.

Keep: the person, face, pose, clothing cut, and framing.

Change: the whole photograph becomes a duotone of navy and warm cream. Shadows go navy, highlights go cream. No third color. No new background scene, no text, no grain heavy enough to hide the face.`,
    why_it_works: `Duotone edits repaint the person. Separating identity and clothing cut from the palette, and capping the result at two named colors, is the control.`,
    tags: ["image-edit", "portrait", "duotone", "fashion", "color"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported duotone studio fashion portrait. The navy-and-cream limit is ours.",
    reference_mode: "edit_source",
    reference_inputs: ["A studio portrait, generated with the setup prompt."],
    setup_prompt: `Three-quarter studio portrait of an adult in a black turtleneck, plain grey backdrop, soft key light from the left, neutral expression, head and shoulders. No text.`,
    review_notes: "Same person and pose. Only navy and cream. No new scene.",
    review: {
      success: "Identity and pose hold; the frame is only navy and cream.",
      failure: "A third color returns or the face changes.",
      check_first: "The eyes and the backdrop color count.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "glass-bottle-restyle",
    title: "Glass Bottle Restyle",
    category: "Image Edits",
    user_input: "Turn a ceramic bottle into clear glass without changing its shape",
    prompt: `Edit the attached product photo. Change the material only.

Keep: the bottle's silhouette, cap shape, label position, camera angle, and table.

Change: the ceramic body becomes clear glass. The liquid inside is pale amber and visible through the glass. Refraction and a contact shadow stay physically plausible. The label remains a blank cream rectangle with no letters.

No brand name, no extra props.`,
    why_it_works: `Material swaps redesign the product. Locking silhouette, cap, and label position, and leaving the label blank, tests refraction without inviting fake branding.`,
    tags: ["image-edit", "material", "product", "glass", "preserve"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported glass-material restyle case. The bottle scene is ours, and the label is deliberately blank.",
    reference_mode: "product",
    reference_inputs: ["A ceramic bottle photo, generated with the setup prompt."],
    setup_prompt: `Studio product photo of a matte sand-colored ceramic bottle with a black screw cap and a blank cream label, standing on a pale stone surface, soft side light, square crop. No text, no logo.`,
    review_notes:
      "Silhouette and cap match. Body is clear glass with pale amber liquid. Label still blank.",
    review: {
      success: "Same silhouette; glass and liquid read clearly; label has no letters.",
      failure: "The bottle is redesigned or the label gains a brand.",
      check_first: "The cap shape and the blank label.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "figurine-beside-person",
    title: "Figurine Beside the Person",
    category: "Interior/Food/Fashion",
    user_input: "Place a small figurine of the same person on the table beside them",
    prompt: `Edit the attached photo. Add one object.

Keep: the person, face, clothes, pose, room, and framing.

Add: a 15 cm painted figurine of the same person, same outfit, standing on the table to the person's left. The figurine is clearly a physical object with a base, in scale with the mug already on the table, not a second full-size person.

No text, no extra copies.`,
    why_it_works: `This edit fails by cloning a second person at full size. Stating the height, the base, and the mug as the scale reference forces a figurine instead of a duplicate.`,
    tags: ["image-edit", "figurine", "identity", "scale", "add-object"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported figurine-and-person case. The scale instruction against the mug is ours.",
    reference_mode: "identity",
    reference_inputs: ["A person seated at a table, generated with the setup prompt."],
    setup_prompt: `Casual indoor photo of an adult seated at a wooden table, navy sweater, facing the camera, a white mug on the table to their left, plain wall behind, window light. Head to waist. No text.`,
    review_notes:
      "Person unchanged. One small figurine with a base on the table, similar outfit, clearly not life size.",
    review: {
      success: "One 15 cm-scale figurine with a base; the person is unchanged.",
      failure: "A second full-size person appears, or the face changes.",
      check_first: "The figurine's height against the mug.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "continuous-line-harbor-print",
    title: "Continuous Line Harbor Print",
    category: "Posters",
    user_input: "A poster drawn with one unbroken line and an exact title",
    prompt: `A portrait art print on warm white paper. The entire drawing is one single unbroken black line of even weight. The line forms a harbor skyline: a lighthouse, two boats, a pier, and a low hill. It never lifts, never branches, and never becomes a second stroke.

Below the drawing, centered, small serif capitals: "HARBOR"
No other text, no fill, no color besides black ink and the paper.`,
    why_it_works: `One-line prints fall apart when the model cheats with a second stroke or a filled shape. The unbroken-line rule and a one-word title make both failures obvious.`,
    tags: ["poster", "line-art", "minimal", "exact-text", "print"],
    source_type: "community_inspired",
    source_creator: "simeon-sanai",
    source_url: ATLAS,
    source_notes:
      "Pattern from simeon-sanai's one-continuous-line country prints, indexed by AtlasCloud. The harbor and the single word are ours.",
    reference_mode: "none",
    review_notes: 'One continuous line only. The only word is "HARBOR".',
    review: {
      success: "A single unbroken line and the word HARBOR, with no fill.",
      failure: "A second stroke, a fill, or extra words appear.",
      check_first: "Whether the line actually joins, and the caption.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "square-water-explainer",
    title: "Square Water Explainer",
    category: "Social Posts",
    user_input: "A square card with one headline and three labeled glasses",
    prompt: `A square social card, white background, flat illustration.

Exact headline at the top, bold black sans-serif, two lines:
"A glass is not
a measurement."

Under it, three simple glasses in a row, water at different heights. Labels under them, small grey sans-serif:
"LOW"
"ENOUGH"
"MORE"

Page mark at the bottom right: "1/5"

Palette limited to white, warm grey, and one pale blue. No logo, no extra sentence.`,
    why_it_works: `Square explainers collect slogans. One quoted headline, three labels, and a page mark are enough to test hierarchy, and the limited palette stops decorative clutter.`,
    tags: ["social", "card", "exact-text", "explainer", "layout"],
    source_type: "community_inspired",
    source_creator: "Carat",
    source_url: CARAT,
    source_notes:
      "Pattern from Carat's square card-news cover. Headline, labels, and page mark are original English.",
    reference_mode: "none",
    review_notes: 'Headline matches the two lines. Labels LOW, ENOUGH, MORE. Page mark "1/5".',
    review: {
      success: "Headline, three labels, and 1/5 are exact, with no extra sentence.",
      failure: "A subtitle or a fourth glass appears.",
      check_first: "The two-line headline and the page mark.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "tote-front-and-back",
    title: "Tote Front and Back",
    category: "Interior/Food/Fashion",
    user_input: "Show the front and back of one tote with the same mark",
    prompt: `Edit the attached product photo into a two-tote mockup.

Keep: the tote's natural canvas color, handles, and stitching.

Show two floating totes, same size, on a pale grey seamless background. The left tote faces forward and carries a small navy square mark, centered, with no letters inside the square. The right tote shows the back, plain canvas, no mark. Soft contact shadows. No model, no text, no hang tag with writing.`,
    why_it_works: `Front-and-back mockups invent a slogan on the back. Specifying a blank square on the front and a plain back makes the pair a fidelity test of one product, not a poster.`,
    tags: ["product", "mockup", "apparel", "front-back", "edit"],
    source_type: "community_inspired",
    source_creator: "Abkr Sadiq",
    source_url: ATLAS,
    source_notes:
      "Pattern from public front-and-back apparel mockups indexed by AtlasCloud. The blank square mark is ours so no brand is copied.",
    reference_mode: "product",
    reference_inputs: ["A blank tote photo, generated with the setup prompt."],
    setup_prompt: `Studio photo of one natural-canvas tote bag, front view, two handles, centered on a pale grey seamless background, soft shadow. No print, no text.`,
    review_notes: "Two totes. Front has only a blank navy square. Back is plain. No words.",
    review: {
      success: "Front and back of the same tote; the only mark is a blank square.",
      failure: "Words appear, or the two bags differ in color or size.",
      check_first: "The back tote and the square.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "hand-drawn-habit-card",
    title: "Hand-Drawn Habit Card",
    category: "Visual Summaries",
    user_input: "A hand-drawn card with one title and three exact steps",
    prompt: `A portrait card that looks hand-drawn in ink on cream paper, slight paper tooth, not a vector infographic.

Exact text:
Title, larger handwriting: "CLOSE THE DAY"
Three numbered steps:
"1  Shut the laptop"
"2  Write one line"
"3  Lights out"

A small ink drawing of a closed laptop beside the title. No other sentences, no clock times, no tips.`,
    why_it_works: `Hand-drawn cards still need exact copy. Numbering three short steps and banning tips keeps the charm of the medium without letting the model write a blog post.`,
    tags: ["hand-drawn", "card", "exact-text", "infographic", "habits"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported hand-drawn infographic cards. The three steps are ours.",
    reference_mode: "none",
    review_notes: 'Title "CLOSE THE DAY" and the three numbered lines, spelled as quoted.',
    review: {
      success: "Title and three steps match, in a hand-drawn ink style.",
      failure: "A fourth step or a printed sans-serif layout appears.",
      check_first: "Step 2's wording.",
      attempts: 2,
      model_hint: "either",
    },
  }),

  recipe({
    slug: "voxel-tool-icons",
    title: "Voxel Tool Icons",
    category: "UI Mockups",
    user_input: "Six matching voxel icons of workshop tools",
    prompt: `A square sheet of six voxel icons on a white background, two rows of three, equal cells, generous gaps.

Each icon is the same voxel scale and the same three-quarter angle, soft clay-like blocks, muted colors:
a hammer, a saw, a wrench, a paintbrush, a ruler, a spool of thread.

No text, no labels, no shadows that connect the icons into one scene. They read as six separate app icons.`,
    why_it_works: `Icon sets drift in angle and scale. One shared voxel size and one camera angle, with six named tools and no labels, is a consistency test distinct from the flat app-icon recipe already in the library.`,
    tags: ["icons", "voxel", "set", "ui", "consistency"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes: "Pattern from the imported voxel 3D icon case. The six tools are ours.",
    reference_mode: "none",
    review_notes:
      "Six icons, same angle and block scale: hammer, saw, wrench, brush, ruler, spool. No text.",
    review: {
      success: "Six consistent voxel tools, no labels.",
      failure: "Mixed angles, flat icons, or words under the cells.",
      check_first: "Whether the ruler and the spool match the hammer's voxel scale.",
      attempts: 2,
      model_hint: "either",
    },
  }),

  recipe({
    slug: "notes-screenshot-exact",
    title: "Notes Screenshot with Exact Lines",
    category: "UI Mockups",
    user_input: "A phone notes screen whose three lines are exact",
    prompt: `A straight-on photo of a phone in a hand, screen facing camera, slight glare. The screen is a plain notes app, off-white, one note open.

Exact screen text, and no other UI words:
Title: "Saturday"
Body, three lines:
"Buy oats"
"Call Mira"
"Walk at 4"

No status-bar clock, no app name, no keyboard, no photos. The hand and phone are generic. Do not imitate a specific phone brand's logo.`,
    why_it_works: `Screenshot prompts invent status bars and extra list items. An allowlist of one title and three lines, plus a ban on the clock, makes the UI checkable.`,
    tags: ["ui", "screenshot", "exact-text", "phone", "notes"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from fictional social-post screenshots in the imported set. Rewritten as a notes screen so it does not imitate a real network or person.",
    reference_mode: "none",
    review_notes: 'Screen shows "Saturday", "Buy oats", "Call Mira", "Walk at 4". No clock.',
    review: {
      success: "Those four strings only, on a notes screen.",
      failure: "A clock, a keyboard, or a fourth task appears.",
      check_first: "The status bar and the third line.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "clay-speaker-ad",
    title: "Clay Speaker Ad",
    category: "Social Posts",
    user_input: "A soft clay-style ad of one speaker with an exact headline",
    prompt: `A square social ad. A small tabletop speaker rendered as soft matte clay, rounded edges, sage green body, cream cone, sitting on a clay plinth. Pastel studio, gentle shadow, no photoreal metal.

Exact headline under the plinth, centered, bold rounded sans-serif: "QUIET ROOM"
No subhead, no logo, no price.`,
    why_it_works: `Soft 3D ads pick up slogans. One quoted headline and a ban on a subhead keep the render as the subject. Clay is named so it does not slide into a photoreal product shot.`,
    tags: ["ad", "clay", "product", "exact-text", "social"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported soft-3D advertisement case. The speaker and headline are ours.",
    reference_mode: "none",
    review_notes: 'Headline exactly "QUIET ROOM". One clay speaker. No logo or price.',
    review: {
      success: "One clay speaker and the quoted headline only.",
      failure: "A subhead, logo, or photoreal speaker appears.",
      check_first: "The headline and the material.",
      attempts: 2,
      model_hint: "either",
    },
  }),

  recipe({
    slug: "museum-label-card",
    title: "Museum Label Card",
    category: "Visual Summaries",
    user_input: "An object photo with a museum label whose fields are exact",
    prompt: `A museum vitrine photo, straight on. Inside, on a linen shelf, one handmade ceramic cup, uneven glaze, sand color. To the right of the cup, a small white label card.

Exact label text, four lines, black serif:
"CUP"
"Stoneware"
"Harbor workshop"
"2024"

No accession number, no paragraph, no donor line. Glass reflection is faint and does not cover the label.`,
    why_it_works: `Museum labels attract fake accession numbers and a paragraph. Four quoted lines next to one object is a field test, and the glass is constrained so it cannot hide a misspelling.`,
    tags: ["museum", "label", "exact-text", "product", "photo"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Original label written for the structured-caption gap. The workshop is fictional.",
    reference_mode: "none",
    review_notes: "Label lines: CUP, Stoneware, Harbor workshop, 2024. No accession number.",
    review: {
      success: "Four label lines match and sit beside one cup.",
      failure: "An accession number or a paragraph is added.",
      check_first: "The third and fourth lines.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "picture-book-spread-line",
    title: "Picture Book Spread with One Line",
    category: "Storyboards",
    user_input: "A two-page picture-book spread with one exact sentence",
    prompt: `An open picture book, photographed from above, two pages.

Left page: a painted night scene of a small paper boat on dark water, one window of light on a far shore. Right page: the same illustration continuing, and at the bottom this exact sentence in a serif face, one line:

"She left a light in the window."

No other words, no page numbers, no title. The gutter is visible. The painting style is gouache, not 3D.`,
    why_it_works: `Picture books add a title and a second sentence. One quoted line and a ban on page numbers make the spread a type test while the gutter proves it is a book, not a poster.`,
    tags: ["picture-book", "spread", "exact-text", "illustration", "story"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Original spread. Distinct from the pop-up recipe: this one is a flat gouache book, not paper engineering.",
    reference_mode: "none",
    review_notes: 'The only sentence is "She left a light in the window." A gutter is visible.',
    review: {
      success: "One exact sentence, two pages, gouache, visible gutter.",
      failure: "A title, page number, or second sentence appears.",
      check_first: "The sentence and the gutter.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "wine-label-exact-vintage",
    title: "Wine Label with an Exact Vintage",
    category: "Posters",
    user_input: "A bottle label whose name, place, and year are exact",
    prompt: `A studio photo of a dark glass wine bottle, three-quarter view, on a slate surface. One cream label, centered.

Exact label text, and nothing else on the label or bottle:
"NORTH SLOPE"
"Table wine"
"2022"

"NORTH SLOPE" is the largest line. No grape variety, no alcohol percentage, no crest, no back label. Soft side light, one bottle only.`,
    why_it_works: `Labels attract a fake appellation and a percentage. Three quoted lines and an explicit ban on the usual extra fields keep the vintage checkable.`,
    tags: ["label", "packaging", "exact-text", "product", "wine"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Original label. Distinct from the existing packaging text-swap, which edits a label already in frame.",
    reference_mode: "none",
    review_notes: "Label reads NORTH SLOPE, Table wine, 2022. No percentage or crest.",
    review: {
      success: "Those three lines only.",
      failure: "A vintage region, percentage, or crest is added.",
      check_first: "The year and the absence of a percent sign.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "isometric-cafe-cutaway",
    title: "Isometric Cafe Cutaway",
    category: "Interior/Food/Fashion",
    user_input: "A small isometric cafe with an exact window sign",
    prompt: `An isometric cutaway of a tiny corner cafe, miniature style, soft daylight, white background. The front wall is removed so the room is visible: four tables, a counter, a pastry case, and one barista. Consistent isometric angle, no second floor.

Exact text on the front window only: "OPEN"
No other words, no street name, no menu board full of items.`,
    why_it_works: `Isometric rooms invent signage. One quoted window word and a fixed object count keep the model on the architecture instead of a street of shops.`,
    tags: ["isometric", "interior", "cutaway", "exact-text", "miniature"],
    source_type: "community_inspired",
    source_creator: "LaplaceYoung",
    source_url: LAPLACE,
    source_notes:
      "Pattern from the imported miniature 3D building cases. The cafe inventory and the OPEN sign are ours.",
    reference_mode: "none",
    review_notes: 'Window says only "OPEN". Four tables, a counter, a pastry case, one barista.',
    review: {
      success: "One isometric cafe, the word OPEN, and the listed furniture.",
      failure: "A menu of extra words or a second building appears.",
      check_first: "The window text and the table count.",
      attempts: 2,
      model_hint: "either",
    },
  }),

  recipe({
    slug: "festival-lineup-order",
    title: "Festival Lineup in Exact Order",
    category: "Posters",
    user_input: "A lineup poster whose four names stay in order",
    prompt: `A vertical festival poster, night photo of a field and a distant stage, dark, with type over the lower half.

Exact text:
Eyebrow: "NORTH FIELD"
Then four names, stacked, largest to smallest, this order:
"LOW TIDE"
"PAPER BOAT"
"JUNE RADIO"
"THE LANTERNS"
Footer: "21 June · gates 4 pm"

No sponsors, no fifth name, no website. Names are original and must be spelled as quoted.`,
    why_it_works: `Lineup posters reorder names and add sponsors. Size order plus a ban on a fifth line makes a swap visible, which is the typography failure this recipe is for.`,
    tags: ["poster", "lineup", "exact-text", "event", "typography"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes: "Original lineup. Names are fictional so the poster does not trade on real acts.",
    reference_mode: "none",
    review_notes:
      "Order: LOW TIDE, PAPER BOAT, JUNE RADIO, THE LANTERNS. Footer matches. No sponsor.",
    review: {
      success: "Four names in that size order and the quoted footer.",
      failure: "Names reorder or a sponsor lockup appears.",
      check_first: "The second and third names.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "listing-card-exact-facts",
    title: "Listing Card with Exact Facts",
    category: "Visual Summaries",
    user_input: "A property card whose price, beds, and street are exact",
    prompt: `A vertical listing card. Top half: a photo of a small white cottage with a green door and a gravel path, overcast day. Bottom half: white panel with type.

Exact text:
"4 HARBOR LANE"
"2 bed · 1 bath"
"Shown at dusk by appointment"

No price, no agency logo, no phone number, no extra claims. The photo must show one cottage, green door, gravel path.`,
    why_it_works: `Listing cards invent prices and phone numbers. Quoting the address and the bed-bath line, and banning a price, keeps the card factual and checkable.`,
    tags: ["listing", "card", "exact-text", "photo", "layout"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes: "Original card. The address is fictional.",
    reference_mode: "none",
    review_notes:
      'Text is "4 HARBOR LANE", "2 bed · 1 bath", and the appointment line. No price or phone.',
    review: {
      success: "Those three lines only, with a green door and gravel path.",
      failure: "A price, logo, or phone number appears.",
      check_first: "The bed-bath line and the absence of a currency amount.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "floor-plan-to-room",
    title: "Floor Plan to Furnished Room",
    category: "Interior/Food/Fashion",
    user_input: "Turn a labeled floor plan into a matching furnished photograph",
    prompt: `Using the attached floor plan as the layout, create a photorealistic eye-level photo of the same room from the doorway.

Keep: one window on the left wall, the door on the near wall, a desk under the window, a bed on the right wall, a rug in the center. Do not add a second window or move the bed to another wall.

Furnish it as a small rented room: oak desk, white bed, wool rug, daylight through the left window. No people, no text, no extra rooms visible.`,
    why_it_works: `Sketch-to-room edits invent architecture. Naming which wall holds the window, door, desk, and bed gives the plan authority over the photograph, which the garden-plan recipe does not cover.`,
    tags: ["floor-plan", "sketch", "interior", "layout", "render"],
    source_type: "community_inspired",
    source_creator: "Kingy AI",
    source_url: "https://kingy.ai/blog/chatgpt-images-2-5-sketch-test/",
    source_notes:
      "Extends the sketch-to-finished pattern Kingy AI tested, applied to a room plan rather than a poster. The plan is ours.",
    reference_mode: "sketch",
    reference_inputs: ["A simple floor plan, generated with the setup prompt."],
    setup_prompt: `A clean black-line floor plan on white, one rectangle room. Door gap on the bottom wall. One window marked on the left wall. A rectangle labeled "DESK" under that window. A rectangle labeled "BED" on the right wall. A rectangle labeled "RUG" in the center. Labels in simple sans-serif. No furniture drawings, no dimensions, no second room.`,
    review_notes:
      "Photo matches the plan: window left, bed right, desk under the window, rug center, door nearest the camera.",
    review: {
      success: "Window, desk, bed, and rug occupy the walls named in the plan.",
      failure: "The bed moves, a second window appears, or the labels remain on the photo.",
      check_first: "Which wall the bed sits against.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "newspaper-front-headline",
    title: "Newspaper Front with One Headline",
    category: "Posters",
    user_input: "A newspaper front page with an exact masthead and one headline",
    prompt: `A broadsheet front page, photographed flat, black ink on off-white newsprint, one photo of a harbor at dawn occupying the upper right.

Exact text:
Masthead: "THE HARBOR LIGHT"
Dateline under it: "Monday 21 September 2026"
Main headline, one line: "The morning boat returns"
One subhead: "A short delay, then the pier."

No other headlines, no bylines, no ads, no real newspaper's name. Columns may contain grey placeholder bars instead of fake article text.`,
    why_it_works: `Newspaper pages fill with nonsense columns. Allowing grey bars for body copy, and quoting only the masthead, dateline, headline, and subhead, tests the hierarchy without fake journalism.`,
    tags: ["newspaper", "exact-text", "editorial", "layout", "print"],
    source_type: "depikt_original",
    source_creator: "Depikt",
    source_notes:
      "Original front page. Placeholder bars are specified so the model does not invent article text.",
    reference_mode: "none",
    review_notes:
      'Masthead "THE HARBOR LIGHT", the quoted dateline, headline, and subhead. No second headline.',
    review: {
      success: "Those four strings are exact and body columns are bars, not words.",
      failure: "Fake article sentences or a second headline appear.",
      check_first: "The dateline and the columns.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),

  recipe({
    slug: "brand-moodboard-three-roles",
    title: "Brand Moodboard from Three Roles",
    category: "Social Posts",
    user_input: "Build one board where each reference controls a different role",
    prompt: `Make one brand moodboard, landscape, from the three attached images. Each image has one job.

Image 1 controls color only: use its palette and no other hues.
Image 2 controls material only: the paper, cloth, and ceramic surfaces should match its textures.
Image 3 controls the object only: include that object once, unchanged in shape.

Layout: a loose grid of five crops on warm paper, with the object from image 3 largest at the left. No words, no logo, no new product.

If a reference conflicts, follow the role assigned above rather than blending the photos into a collage of the originals.`,
    why_it_works: `Moodboards fail by pasting the references side by side. Assigning color, material, and object to separate images is the multi-reference pattern, applied to a board instead of a single scene.`,
    tags: ["moodboard", "multi-reference", "brand", "roles", "style"],
    source_type: "community_inspired",
    source_creator: "Zawa",
    source_url: ZAWA,
    source_notes:
      "Pattern from Zawa's brand-moodboard and reference-role prompts. The three-role split and five-crop layout are ours.",
    reference_mode: "multi_reference",
    reference_inputs: [
      "Image 1: a color palette photo, generated as a flat set of paint swatches.",
      "Image 2: a material photo of linen and unglazed ceramic.",
      "Image 3: one object, a small stoneware cup.",
    ],
    setup_prompt: `Three separate reference images are required. If generating stand-ins: (1) six paint swatches in sand, olive, cream, ink, rust, and pale blue, labeled only by color blocks with no words; (2) a close photo of oatmeal linen beside unglazed sand ceramic; (3) one small stoneware cup, blank, on white.`,
    review_notes:
      "The cup's shape matches image 3. Colors come from image 1. Surfaces match image 2. No text. Not a paste-up of the three photos.",
    review: {
      success: "One board, cup shape preserved, palette and materials assigned, no words.",
      failure: "The three references are pasted as a collage, or the cup is redesigned.",
      check_first: "Whether the cup still matches image 3.",
      attempts: 2,
      model_hint: "sunburst",
    },
  }),
];
