-- Re-shot Ticket Localization record (flat ticket, no hand). One-row upsert copied
-- from insert-images-2-5-batch1-staged.sql; run in the Supabase SQL Editor.

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
