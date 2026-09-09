-- Re-shot / replaced results (2026-09-09): architectural poster, aurora slide, ticket.
-- Three one-row upserts copied from insert-images-2-5-batch1-staged.sql; run in the Supabase SQL Editor.

-- 6. Architectural Minimalist Poster
INSERT INTO public.curated_prompts (
  id, slug, title, category, user_input, prompt, why_it_works, source, tags, target_model,
  source_type, source_creator, source_url, source_notes, status, generation_ready, gallery_ready,
  needs_reference_images, reference_mode, review_notes, result_count, thumbnail_url, created_at, updated_at
) VALUES (
  'images25-architectural-minimalist-poster',
  'architectural-minimalist-poster-pavilion',
  'Architectural Minimalist Poster',
  'Posters',
  $input$Clean architecture poster: one building, one giant word, small annotations$input$,
  $p$Vertical 2:3 minimalist architecture poster, off-white ground. This is a flat graphic illustration, not a photograph or 3D render: no photographic lighting, no reflections, no gradients, no texture.

Subject: the Barcelona Pavilion (Mies van der Rohe, 1929) drawn in exactly three flat tones: travertine cream for the walls, roof slab and paving; deep viridian for the green-marble wall; a single thin grey line for the chrome columns and edges. Slight elevation view showing the flat roof plane, the reflecting pool as one flat pale-blue shape, and one free-standing wall.

Behind the building, one enormous word in a light-weight geometric sans, cropped by the left and right poster edges, in a grey only two steps darker than the ground: "PLANE".

Small annotations in a mono typeface, each placed near what it names with a thin leader line, in this exact wording: "roof plane, 1929" · "onyx and marble" · "eight cruciform columns" · "reflecting pool".

No other text. No frame, no logo, no date line.$p$,
  $w$A minimal constraint set (one building, one word, four quoted labels) leaves the model nothing to fill in except composition and negative space, which is where 2.5's layout control shows. The giant word sits behind the building so it can be cropped without hurting legibility. Swap the building, the word and the four labels.$w$,
  'curated',
  ARRAY['poster', 'architecture', 'minimalist', 'typography', 'exact-text', 'editorial', 'template']::text[],
  'gpt-image-2.5',
  'depikt_original',
  'Depikt',
  NULL,
  $n$Images 2.5 rewrite of the legacy GPT Image 2 entry 'curated-architectural-minimalist-poster'. The legacy entry is unchanged.$n$,
  'approved',
  true,
  true,
  false,
  'none',
  $r$Check the pavilion is recognisable, the word PLANE is exact and cropped by the edges, and all four annotations are present and correctly placed.
Outcome: Attempt 1 (Flare) rendered a photoreal pavilion despite "flat illustration"; prompt revised to state "flat graphic illustration, not a photograph or 3D render" and name the flat pool shape. Attempt 2 passes: three flat tones, PLANE cropped by the edges, four exact mono annotations with leader lines. Published image replaced 2026-09-09 with a ChatGPT (Images 2.5) run of the same prompt supplied by the Depikt team: flat illustration, PLANE cropped, pool and travertine wall; note the "onyx and marble" label is drawn as a leader line without its text in this version.
Model used: flare; attempts: 2.
Success: Recognisable pavilion, one giant word, four exact mono annotations, lots of clean ground.
Likely failure: Extra annotations; the giant word rendered fully inside the frame and dominating; a photographic render instead of flat illustration.
Check first: The four annotations.
Attempts: 2. Model: either.$r$,
  3,
  '/library/images-2-5/architectural-minimalist-poster-pavilion.webp',
  '2026-09-09T18:00:00.000Z',
  '2026-09-09T18:00:00.000Z'
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, category = EXCLUDED.category,
  user_input = EXCLUDED.user_input, prompt = EXCLUDED.prompt, why_it_works = EXCLUDED.why_it_works,
  tags = EXCLUDED.tags, target_model = EXCLUDED.target_model, source_type = EXCLUDED.source_type,
  source_creator = EXCLUDED.source_creator, source_url = EXCLUDED.source_url,
  source_notes = EXCLUDED.source_notes, status = EXCLUDED.status,
  generation_ready = EXCLUDED.generation_ready, gallery_ready = EXCLUDED.gallery_ready,
  needs_reference_images = EXCLUDED.needs_reference_images, reference_mode = EXCLUDED.reference_mode,
  review_notes = EXCLUDED.review_notes, result_count = EXCLUDED.result_count,
  thumbnail_url = EXCLUDED.thumbnail_url, updated_at = now();

-- 7. Northern Lights Explainer Slide
INSERT INTO public.curated_prompts (
  id, slug, title, category, user_input, prompt, why_it_works, source, tags, target_model,
  source_type, source_creator, source_url, source_notes, status, generation_ready, gallery_ready,
  needs_reference_images, reference_mode, review_notes, result_count, thumbnail_url, created_at, updated_at
) VALUES (
  'images25-aurora-explainer-slide',
  'aurora-explainer-slide',
  'Northern Lights Explainer Slide',
  'Visual Summaries',
  $input$Presentation slide explaining a science topic with a four-step icon diagram$input$,
  $p$A single 16:9 presentation slide, dark navy background, with a photographic image of the aurora over a snowy ridge filling the right third and fading into the slide colour.

Top left, small letter-spaced label: "THE SUN'S ENERGY, SEEN FROM EARTH". Below it, the title in a large serif on two lines: "What Causes" / "the Northern Lights?" with the second line in a pale green.

Beneath the title, a short paragraph in a light sans: "Charged particles from the Sun are steered by Earth's magnetic field toward the poles, where they collide with gases in the upper atmosphere and make them glow."

Along the bottom, four steps in a row, each with a thin-line circular icon, a numbered caption in small capitals and one sentence beneath:
"1. SOLAR WIND" — "The Sun streams charged particles into space."
"2. MAGNETIC FIELD" — "Earth's field bends them toward the poles."
"3. COLLISION" — "Particles strike oxygen and nitrogen high above the ground."
"4. GLOW" — "Oxygen glows green and red; nitrogen adds blue and violet."

Thin arrows between the steps. Footer left: "small changes, a clearer sky". Footer right: "4". No other text.$p$,
  $w$Slide-ready visuals need real information laid out with a hierarchy, not decoration. Every string is quoted and every region is placed, so the model is composing, not inventing copy. The four-step icon row with arrows is the structure most explainer decks reuse. Swap the topic and the four steps.$w$,
  'curated',
  ARRAY['slide', 'explainer', 'science', 'infographic', 'presentation', 'exact-text', 'layout']::text[],
  'gpt-image-2.5',
  'official_inspired',
  'OpenAI',
  'https://openai.com/index/introducing-chatgpt-images-2-5/',
  $n$OpenAI's launch page shows a 'What Causes Solar Flares?' slide inside a Google Slides window; no prompt published. This reconstruction uses a different topic and its own copy.$n$,
  'approved',
  true,
  true,
  false,
  'none',
  $r$Read the paragraph and all four captions and sentences. Check that icons are distinct and that the aurora photo does not sit under the text.
Outcome: Pass on attempt 1 (Sunburst medium). Title, paragraph, four captions and sentences, both footers exact; four distinct icons; photo confined to the right third. Published image replaced 2026-09-09 with a ChatGPT (Images 2.5) run of the same prompt supplied by the Depikt team; same layout and copy, all strings exact.
Model used: sunburst; attempts: 1.
Success: Every string exact; four distinct icons with arrows; readable hierarchy; photo confined to the right.
Likely failure: The body paragraph paraphrased; captions merged; icons duplicated.
Check first: The body paragraph, the longest string.
Attempts: 2. Model: sunburst.$r$,
  2,
  '/library/images-2-5/aurora-explainer-slide.webp',
  '2026-09-09T18:00:00.000Z',
  '2026-09-09T18:00:00.000Z'
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, category = EXCLUDED.category,
  user_input = EXCLUDED.user_input, prompt = EXCLUDED.prompt, why_it_works = EXCLUDED.why_it_works,
  tags = EXCLUDED.tags, target_model = EXCLUDED.target_model, source_type = EXCLUDED.source_type,
  source_creator = EXCLUDED.source_creator, source_url = EXCLUDED.source_url,
  source_notes = EXCLUDED.source_notes, status = EXCLUDED.status,
  generation_ready = EXCLUDED.generation_ready, gallery_ready = EXCLUDED.gallery_ready,
  needs_reference_images = EXCLUDED.needs_reference_images, reference_mode = EXCLUDED.reference_mode,
  review_notes = EXCLUDED.review_notes, result_count = EXCLUDED.result_count,
  thumbnail_url = EXCLUDED.thumbnail_url, updated_at = now();

-- 9. Ticket Localization / Text Replacement
INSERT INTO public.curated_prompts (
  id, slug, title, category, user_input, prompt, why_it_works, source, tags, target_model,
  source_type, source_creator, source_url, source_notes, status, generation_ready, gallery_ready,
  needs_reference_images, reference_mode, review_notes, result_count, thumbnail_url, created_at, updated_at
) VALUES (
  'images25-ticket-localization-edit',
  'ticket-localization-edit',
  'Ticket Localization / Text Replacement',
  'Image Edits',
  $input$Swap the city, stamp and illustration on a designed ticket while locking everything else$input$,
  $p$Edit the attached ticket image. Change only three things:

1. The city name printed on the stub, currently "TOKYO", becomes "LISBON" in the same typeface, size, colour and position.
2. The round postmark stamp beneath it becomes a Lisbon stamp: the word "LISBON" around the ring and a small tram icon in the centre, in the same ink colour and size.
3. The illustration panel changes from the Tokyo scene to the Alfama district with the 25 de Abril bridge in the background at golden hour, in the same vintage screen-print style, palette and framing.

Keep exactly as they are: the ticket's shape, position and perforations, the barcode, the masthead text, the cream surface, the lighting, the shadow and the paper texture. No other text changes.$p$,
  $w$Three coordinated changes with an explicit lock list is the localization pattern Images 2.5 was demonstrated on. Quoting the old and new strings and naming the region by position removes ambiguity about what "the city" means. Swap the city, the stamp icon and the landmark scene.$w$,
  'curated',
  ARRAY['image-edit', 'text-swap', 'localization', 'ticket', 'exact-text', 'preserve', 'layout']::text[],
  'gpt-image-2.5',
  'official_inspired',
  'OpenAI',
  'https://openai.com/index/introducing-chatgpt-images-2-5/',
  $n$OpenAI's 'Multi-city ticket' reel cycles New Delhi, São Paulo, Tokyo, Paris and San Francisco on one locked ticket; no prompt published. The prompt is a Depikt reconstruction; the setup prompt produces a base ticket to edit.

SETUP PROMPT: Product photograph, shot straight down, of a vintage two-part travel ticket lying flat and centred on a plain warm-cream paper surface, soft even daylight, no hands, no props. The stub on the left reads "TOKYO" in red condensed capitals with a round red postmark stamp beneath it and a small barcode. The main panel shows a screen-print illustration of Tokyo at golden hour: Mount Fuji, the Skytree and a red pagoda with cherry blossom. Masthead across the top of the panel: "IDEAS TRAVEL FURTHER". Perforated edge between stub and panel, cream card stock with fine grain, a slight soft shadow under the ticket. No other text.$n$,
  'approved',
  true,
  true,
  true,
  'edit_source',
  $r$Diff the edit against the base pixel by pixel outside the three regions: perforations, barcode, masthead, surface and shadow must be unchanged. Confirm 'LISBON' twice and the tram icon.
Outcome: Pass on attempt 1 (Sunburst medium) on a generated Tokyo base ticket. "LISBON" twice, tram stamp, Alfama and bridge panel; hand, perforations, barcode, masthead and sky unchanged. Re-shot 2026-09-09 without the hand: a flat straight-down ticket on cream card as the base, same three-change edit on Sunburst medium, pass on attempt 1; ticket outline, perforations, barcode, masthead, surface and shadow unchanged. The flat version is the published result.
Model used: sunburst; attempts: 1.
Success: City, stamp and illustration changed; everything else identical; strings exact.
Likely failure: Masthead re-rendered; barcode redrawn; the ticket shifts on the surface.
Check first: The barcode and masthead, the two things most likely to be silently re-rendered.
Attempts: 2. Model: sunburst.
Reference inputs: The base ticket image, generated with the setup prompt or supplied.$r$,
  2,
  '/library/images-2-5/ticket-localization-edit.webp',
  '2026-09-09T18:00:00.000Z',
  '2026-09-09T18:00:00.000Z'
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, category = EXCLUDED.category,
  user_input = EXCLUDED.user_input, prompt = EXCLUDED.prompt, why_it_works = EXCLUDED.why_it_works,
  tags = EXCLUDED.tags, target_model = EXCLUDED.target_model, source_type = EXCLUDED.source_type,
  source_creator = EXCLUDED.source_creator, source_url = EXCLUDED.source_url,
  source_notes = EXCLUDED.source_notes, status = EXCLUDED.status,
  generation_ready = EXCLUDED.generation_ready, gallery_ready = EXCLUDED.gallery_ready,
  needs_reference_images = EXCLUDED.needs_reference_images, reference_mode = EXCLUDED.reference_mode,
  review_notes = EXCLUDED.review_notes, result_count = EXCLUDED.result_count,
  thumbnail_url = EXCLUDED.thumbnail_url, updated_at = now();
