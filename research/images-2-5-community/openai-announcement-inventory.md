# OpenAI announcement — every example, and what we do with it

Source: [Introducing ChatGPT Images 2.5](https://openai.com/index/introducing-chatgpt-images-2-5/), read in the browser on 2026-09-09. The page is 19,004 px tall and holds 16 still examples and 8 videos (Vimeo embeds behind tabs). Every still was downloaded and viewed; every video was pulled from its HLS stream and frame-sampled. Local copies are in `openai-assets/`. Vimeo ids and stream data are in the scratchpad `vimeo-*.json` files.

OpenAI publishes prompts for only two of these: the '80s portrait (one line, shared-prompt page) and the two edit reels (captions inside the video). Everything else is an output with alt text only. So the plan below is: **use OpenAI's edit prompts verbatim as the benchmark layer, and write Depikt adaptations for the output-only examples.**

## Section by section

### 1. Image fidelity as you create — school-portrait re-dress

| | |
|---|---|
| Asset | `baby-portrait-before.jpg` → `baby-portrait-after.jpg` |
| What it shows | A phone photo of a printed studio portrait (child, red polo, blue backdrop, glare and skew from the print). Output keeps the print, glare, pose, backdrop and face; only the clothing becomes an ivory tuxedo with black shawl lapels and bow tie. |
| Prompt published | No |
| Capability | Reference fidelity + clothing-only edit on a *photographed print* |
| Plan | **Add as test 3b.** It is the wardrobe-swap test on a harder input than a clean photo. Depikt adaptation: "Edit the attached photo of a printed portrait. Change only the clothing to an ivory dinner jacket with black satin shawl lapels, a white shirt and a black bow tie. Preserve the child's face, expression, hair, pose, the blue studio backdrop, the print's glare, edge and skew, and the surroundings outside the print." Intent `edit_source`, category IMAGE EDIT. |

### 2. Precision editing — reel A, "Full-body edits" (Vimeo 1224686197, 17 s)

| | |
|---|---|
| Asset | `sheet-full-body-edits.jpg`, captions in `fb-sheet-1..5.png`, prompts in `openai-100-edits.json` |
| What it shows | One neutral full-body portrait (woman, charcoal top, dark trousers, white sneakers, grey seamless) run through 100 independent edits on both GPT Image 2 and 2.5 at quality high. Categories: clothing 1–20, background 21–40, accessories 41–60, artistic medium 61–79, lighting and photographic finish 81–100. Edits 75 and 80 are omitted in the reel. |
| Prompt published | **Yes, all 98 captions**, transcribed verbatim. |
| Capability | Precise edit; "change only X" with implicit preservation |
| Plan | **This becomes Depikt's edit benchmark.** Use the 98 prompts unmodified as the `original_prompt_verbatim` layer for the Critic benchmark (the Critic should score them as already-good bounded edits) and pick one per category as a Library recipe with a Depikt PRESERVE block added. Note the pattern OpenAI uses: one sentence, one change, one guard clause ("no readable titles", "keep the eyes visible", "do not add visible candles"). That is the shape our `edit_source` writer should emit by default. |

Recommended Library picks from the 98, one per category: 003 burgundy cable knit (texture must be visible), 030 nighttime neon street (no readable signs), 045 round clear glasses (eyes undistorted), 073 risograph print (registration offsets), 099 soft window backlight (hair rim). Each is short enough to publish as-is with attribution.

### 3. Precision editing — reel B, "Multi-city ticket" (Vimeo 1224686194, 6 s, 1080×1920)

| | |
|---|---|
| Asset | `sheet-multi-city-ticket.jpg` |
| What it shows | A hand holds a vintage two-part ticket ("IMAGEGEN 2.5 TICKET · IDEAS TRAVEL FURTHER"). Across frames the city name, the round postmark stamp, and the landmark illustration change (New Delhi / India Gate, São Paulo / Octávio Frias bridge, Tokyo / Fuji and Skytree and pagoda with blossom, Paris / Eiffel, San Francisco / Golden Gate) while the hand, ticket geometry, perforations, barcode, sky and the "IMAGEGEN 2.5" masthead stay locked. |
| Prompt published | No |
| Capability | Localization edit: swap text + one illustration, lock the layout |
| Plan | **Add as test 17 (new).** This is God of Prompt template 13 with a real reference. Depikt adaptation: "Edit the attached ticket. Change only three things: the city name to "SÃO PAULO", the postmark to a São Paulo stamp, and the illustration panel to the Octávio Frias de Oliveira bridge at golden hour in the same vintage screen-print style. Keep the hand, ticket shape, perforations, barcode, masthead text, colours and lighting exactly as they are. No other text changes." Intent `edit_source`, category IMAGE EDIT, tags text-swap, localization. |

### 4. Multi-turn editing consistency — "Cube rotation" (Vimeo 1224686193, 3 s)

| | |
|---|---|
| Asset | `cube-rotation-first-frame.jpg`, `sheet-cube-rotation.jpg` |
| What it shows | Side-by-side blue cube, 150 generated frames, 3 s at 50 fps, 360° rotation, "matched pose guides · no interpolation". GPT Image 2 drifts in position and size; 2.5 stays locked. |
| Prompt published | No (the on-screen spec is a caption) |
| Capability | Multi-turn stability |
| Plan | Already covered by community record b03 (chetaslua measured the same test: 5–8 px jumps vs 0.8 px). **Do not add as a recipe**; cite in the blog. |

### 5. Multi-turn editing consistency — "Travel infographic" (Vimeo 1224686192, 6 s, 1024×1634)

| | |
|---|---|
| Asset | `travel-infographic-first-frame.jpg`, `sheet-travel-infographic.jpg` |
| What it shows | A dense Chinese travel infographic for Yichang (宜昌) edited five times in sequence. Each turn's prompt is shown as a caption. |
| Prompt published | **Yes, five turns, verbatim:** 1. Change the big white title text at the top-left from "宜昌" to "宜昌旅行". 2. Replace the red vertical badge text next to the title with "一泊两日攻略". 3. In the top-right white info box, change the first line text to "总时长：2天1夜（约48小时）". 4. Change the blue section header on the right from "推荐行程（1天半）" to "推荐行程（2天1夜）". 5. Remove the purple "费用参考（人均）" box at the bottom-right, including its bullet list and total. |
| Capability | Multi-turn text edits on a dense layout, CJK text |
| Plan | **Add as test 18 (new), and make it the model for test 2 (master lock).** The pattern is: name the region by position and colour, quote the old and new text, one change per turn. Depikt adaptation on an English infographic of our own, five turns, same shape. Intent `edit_source`, category INFOGRAPHIC/DIAGRAM. Also a Critic benchmark: the Critic should not "improve" these prompts. |

### 6. Multi-turn editing consistency — "Birthday candles" (Vimeo 1224779251, 5 s)

| | |
|---|---|
| Asset | `cake-first-frame-native.jpg`, `sheet-birthday-candles.jpg` |
| What it shows | A chocolate yule-log cake with ten gold candles, meringue mushrooms, a green frog figurine. Across turns the candles light one by one, left to right; nothing else moves. |
| Prompt published | No |
| Capability | Incremental multi-turn state change |
| Plan | **Add as test 19 (new).** Depikt adaptation is a chain: "Light only the first candle from the left. Everything else stays exactly the same." then "Light the next candle. Keep the previously lit candles lit." ×9. Measures whether earlier edits survive later ones, which is OpenAI's explicit claim. Intent `edit_source`, category IMAGE EDIT. |

### 7. Intelligence and style improvements — nine output-only stills

Each is an output without a prompt. We write a Depikt prompt that would plausibly produce it, generate, and compare to OpenAI's image. This is the "reverse-engineer the launch gallery" set and it maps cleanly onto existing Library categories.

| Asset | What it shows | Capability claimed | Depikt category / intent | Plan |
|---|---|---|---|---|
| `retrofuturism.jpg` | 1950s gouache-style illustration: family on a balcony looking into an O'Neill-cylinder habitat with lakes, towns, a sun and Earth through the window | Style fidelity, complex scene coherence | OPEN-ENDED CREATIVE, none | Add as recipe R1. Period medium + impossible architecture; tests whether the model keeps the mid-century paint look while resolving a curved landscape. |
| `mid-century-modern-posters.jpg` | 3×3 grid of nine posters, each with exact slogan text ("Travel Farther", "CREATE", "Grow Together", "Listen More", "Find Your Balance", "Drink More Water", "Learn Something New", "See the Beauty", "Choose Kindness"), geometric shapes, one halftone photo eye | Text in multiple type styles, grid layout | POSTER/COVER, none | Add as recipe R2. Nine quoted strings in one image is the hardest text test on the page. Merges with batch test 10's text-rendering goal. |
| `impressionist-cityscape.jpg` | Impressionist oil of a San Francisco hill street toward the Golden Gate and Coit Tower | Style + real-world landmark accuracy | OPEN-ENDED CREATIVE, none | Add as recipe R3, paired with the 100-edit "artistic medium" prompts. |
| `wedding-invitation.jpg` | Flat-lay of an ornate cream and gold invitation, crowned "A E" monogram, lions and angels, full body copy ("Amelia Rose & Ethan James … Saturday, the fourteenth of June, two thousand twenty-five … Villa Eterna, Lake Como, Italy"), wax seal, ribbon, envelope liner with a Lake Como painting | Long exact text, print texture, styled photography | POSTER/COVER (print collateral), none | Add as recipe R4. Also the reference example for the new ChatGPT "Templates" feature (invitation template). |
| `sci-fi-surrealism.jpg` | A suited man floating in a starry blue sky beneath an inverted neon city, film-grain photographic finish | Surreal composition, photographic grade | CINEMATIC SCENE, none | Add as recipe R5. |
| `vintage-national-park-stamps.jpg` | Eight perforated stamps, each with park name, state, tagline ("America's First National Park", "Nature's Cathedral", "River of Grass"…) | Repeated structured units with distinct text each | POSTER/COVER or STORYBOARD/MULTI-PANEL, none | Add as recipe R6. Same shape as the Goodmanprotocol poster series but eight-up; good replacement for the dropped "restoration" slot. |
| `presentation-image.jpg` | A Google Slides window showing a generated slide: "What Causes Solar Flares?", four-step icon diagram with captions, sun photo | Slide-ready visual with real information | VISUAL SUMMARY, none | Add as recipe R7. Note the screenshot is a mock of Slides; the generated asset is the slide itself. |
| `mosaic.jpg` | Blue and gold tile mosaic of Earth under stars, planets, a spiral galaxy | Material simulation (grout, tesserae) | OPEN-ENDED CREATIVE, none | Add as recipe R8. |
| `stickers.jpg` | Vintage blue poster: "ChatGPT Stickers / New sticker pack", Japanese header and side copy, a black cat holding a sticker sheet, paper creases | Mixed-script text, poster + illustrated product | POSTER/COVER, none | Add as recipe R9, but replace the ChatGPT branding with a neutral brand. |
| `cyberpunk.jpg` | Lone figure on a wet balcony over a rain-soaked megacity, billboards, flying vehicles | Cinematic realism, dense detail | CINEMATIC SCENE, none | Add as recipe R10 only if we want a "generic cinematic" control; otherwise skip, since the Library already has many of these. |

### 8. Use Sketch to draw your idea to life (Vimeo 1224779248, 33 s)

| | |
|---|---|
| Asset | `sheet-sketch.jpg` |
| What it shows | Product video for the `@Sketch` feature: a yellow-orange doodle becomes a nugget-shaped character; a rough crab sketch becomes a red crab-shaped children's chair in a classroom; a plan-view garden doodle (pool blob, table, trees) becomes a photoreal garden with kidney pool; a jacket outline becomes a blue leather jacket; a horse-with-wings outline. Tagline "Create anything with just your finger". |
| Prompt published | No |
| Capability | Sketch as spatial constraint |
| Plan | **Feeds test 12.** Two of these are exact Depikt `sketch_layout` cases: the garden plan (top-down sketch → photoreal scene, layout preserved) and the jacket outline (silhouette → product). Add the garden plan as test 12b. Note for the product: Sketch is a ChatGPT-only feature, so the Builder should say "draw with @Sketch or attach a sketch". |

### 9. Structure your prompts for better results — Templates (Vimeo 1224779249, 28 s)

| | |
|---|---|
| Asset | `templates-first-frame-native.jpg`, `sheet-templates.jpg` |
| What it shows | Template cards: Leaf green-tea box (product), cat-hug illustration, "BLOOM" poster, headshot, interior design, logo, "Lost Frog" flyer. Logo flow: "What is the brand called, and what does it do?" → "Iron Comet, a motocross racing team." → style chips Emblem / Symbol / Playful / Retro / Wordmark / Lettermark / Integrated → logo → "Awesome, let's make some merch for our team." → Dad hat / Zip up hoodie / Long sleeve / Mug / T-shirt / Bucket hat / Keychain → cap mockup → rider photo wearing the kit. |
| Prompt published | No |
| Capability | Structured briefs; brand-to-merch continuity |
| Plan | Two things. (a) **Add test 20 (new): logo → merch → in-use photo**, a three-turn chain that keeps the wordmark identical across a cap, a hoodie and a rider. Intent `product_object`, category INTERIOR/ARCH/FOOD/FASHION (product). (b) The template list (Poster, Merch, Product photo, Flyer, Logo, Headshot, Interior) is OpenAI's own category taxonomy for 2.5 and matches Depikt's playbooks nearly one to one; note it in the Builder copy. |

### 10. Pass your best ideas along — '80s portrait

| | |
|---|---|
| Asset | `80s-headshot.jpg` |
| What it shows | Smiling man, curly hair, teal/navy/pink windbreaker, gold chain, neon laser backdrop, boombox, faded print border. |
| Prompt published | **Yes.** Shared-prompt page "Neon 80s Portrait": `Show me what I would look like if I was in the '80s`. Requires an uploaded photo. |
| Capability | Identity preservation through a style transform |
| Plan | **Add as test 21 (new), the identity control.** The prompt is deliberately minimal; the Depikt version adds the identity lock: "Use the attached photo as the identity reference: keep this exact person recognisably the same. Restyle everything else as a 1980s studio portrait: …". Banana Prompts ran the same trend (their post, 1 like). Intent `subject_identity`, category OPEN-ENDED CREATIVE. |

### 11. Hero video (Vimeo 1224789186, 58 s) and the closing customer quote

The hero is a lifestyle montage with four in-product prompts visible: "Create a candle holder" (from a sketch), "Let's try a bolder haircut" (selfie edit), "Create a tattoo of Ziggy" (pet photo → tattoo design), "Arrange these flowers. Something classic but a little wild." These are consumer one-liners; no plan beyond noting that the haircut edit and pet-tattoo are two more `subject_identity` cases if we want lighter recipes. Higgsfield's quote ("understands what not to change") is marketing.

## Net change to the batch

The 16-test batch from the audit grows to **21**, and the Library gets a separate **launch-gallery recipe set** (R1–R9) plus a **98-prompt edit benchmark**.

| New | Test | Source | Intent |
|---|---|---|---|
| 3b | Clothing swap on a photographed print | school-portrait pair | edit_source |
| 12b | Top-down garden sketch → photoreal scene | Sketch video | sketch_layout |
| 17 | Ticket localization: swap city text + illustration, lock layout | Multi-city ticket reel | edit_source |
| 18 | Five-turn text edits on a dense infographic | Travel infographic reel (prompts verbatim) | edit_source |
| 19 | Light candles one per turn | Birthday candles reel | edit_source |
| 20 | Logo → cap → hoodie → rider, wordmark locked | Templates video | product_object |
| 21 | '80s portrait with identity lock | Shared prompt | subject_identity |

Two rules that come out of reading OpenAI's own prompts:

1. OpenAI's edit prompts are one sentence with one guard clause. Depikt's `edit_source` output is longer (CHANGE ONLY / PRESERVE / MATCH). Keep the structure, but the Critic must not penalise a short bounded edit like "Add a pair of modest pearl stud earrings" as under-specified. Put the 98 into the Critic benchmark as expected-high-score cases.
2. Every text edit names the region by position and colour and quotes both old and new strings. Adopt that in the Builder's text-edit guidance.

## Assets not worth carrying

The 26 `Custom_*.png` files at the top of the page are the animated headline letterforms, not examples. The Astra hero mp4 and the two "Keep reading" cards belong to other posts.
