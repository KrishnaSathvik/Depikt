# Images 2.5 community research — source audit

Audited 2026-09-09, one day after the ChatGPT Images 2.5 launch. Every claim in the Phase 4 plan was checked against the primary source: the OpenAI announcement and API docs, the `magiccreator-ai/awesome-gpt-image-2-5-prompts` repository cloned locally at commit `8b2536a`, all 57 tweets it cites fetched individually, both Reddit threads read in a browser, the four named X accounts read in a browser, the 12ui comparison page and its JS bundle, and the three blog posts.

## Verdict

The plan's direction is right and its research workflow is sound. Six of its factual claims need correcting before they turn into collection entries, and the "20 community-inspired tests" list should be re-cut from 20 items to 16 because four of them are not actually stressed by the community yet or duplicate each other.

## What checked out

| Claim in the plan | Status | Evidence |
|---|---|---|
| Images 2.5 launched September 8 | Confirmed | OpenAI announcement; API snapshot ids `gpt-image-2.5-flare-2026-09-08`, `gpt-image-2.5-sunburst-2026-09-08` |
| OpenAI highlights transparent backgrounds | Confirmed | Announcement: "handle more complex layouts including transparent backgrounds". API docs: request `background="transparent"` with PNG or WebP and check the alpha channel |
| "Move the lamp to the right" is a public prompt | Confirmed | @higgsfield_ai, 2026-09-09 02:39 UTC, 38 likes |
| "remove slop" is a public prompt | Confirmed | @higgsfield_ai, 2026-09-09 05:21 UTC, 479 likes |
| Multi-reference role assignment post exists | Confirmed | @godofprompt, 2026-09-09 02:59 UTC. Full text of all 15 templates captured below. 4 likes, no result images |
| Fashion photo to ink and watercolor illustration | Confirmed | @bananaprompts, 2026-09-08 22:34 UTC, prompt text in a reply, 1 like |
| Showa-era Japanese railway poster prompt | Confirmed | @Goodmanprotocol, 2026-09-09 04:28 UTC, 1,733-character template, 38 likes. Two sibling poster prompts posted the same day |
| r/codex UI benchmark with 12ui | Confirmed | Poster runs 12ui. Full-quality comparison at 12ui.com/gpt-image-2.5-vs-2 with 12 prompts, cost and time per quality level |
| r/accelerate sentiment is mixed on instruction following | Confirmed but thin | One original poster: "in terms of instruction following, I had some mixed results. I have a hard time telling if LLM twists my prompt". Comments are about Astra, not images |
| Kingy AI sketch test | Confirmed | 8 scenarios × 3 conditions, one retained failure (sneaker, sketch-only, no output after 90 s). Self-scored: sketch plus brief 97.8, sketch alone 64.6 |
| Medium and YouTube are thin | Confirmed | YouTube: OpenAI's two official videos, one creator review, one API vendor tutorial. Medium: nothing indexed for the exact phrase |

## What needs correcting

1. **The GitHub index has 57 entries, not 38, and only 27 carry a prompt.** The maintainers added 20 entries today (commit "Add 20 high-view GPT Image 2.5 examples", 2026-09-09 21:07 +0800). Thirty entries say "the creator did not publish a reusable prompt", so they are showcases, not recipes. The index is curated by MagicCreator, a paid generation service, and every entry links to their gallery. Twenty-four of the 57 entries come from the two Higgsfield accounts, another vendor. Treat the index as a lead list, not a corpus.

2. **Three attributions in the plan point at the wrong source.** "Lock a master image" is not in the GitHub index; it is God of Prompt template 2. "Product → new setting with contact shadows" is not in the index either; the closest public texts are God of Prompt template 4 and Flixly's sample edit prompt. "Style reference + product → UGC" is @Mho_23's two-step workflow, which first asks GPT-6 Astra for a JSON style description, then generates. That intermediate step matters for the Depikt adaptation.

3. **The architecture prompt set was never run on Images 2.5.** MeltFlex's 40 prompts are author-written and the post states that `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst` "still return model_not_found on our API key". The prompts are good GPT Image 2-era text, relabeled. Keep the technique, drop the "tested on 2.5" implication.

4. **The r/codex UI prompt is not "redesign without feature invention".** It is the opposite. The 12ui prompt tells the model to "preserve only its interaction archetype, information needs, and useful actions" from Image 1 and then "recompose it freely into a distinctly different product, content domain, hierarchy, and visual identity", using Images 2, 3 and 4 as separate donors for composition, typography and color. Batch items 7 and 8 should be reframed around that functional-spec pattern.

5. **The top sprite-sheet post records a failure, not a success.** @8co28's 4×4 combat sprite sheet (4,874 likes, the second most-liked post in the index) says transparency failed on the first pass and needed a fresh chat: "after making the background transparent, split it 4×4, align, and make a GIF". That is exactly the kind of failure note the research record is for.

6. **Engagement is lopsided, and the accounts the plan leads with are the quiet ones.** God of Prompt's post has 4 likes and no images; Banana Prompts' has 1. The posts with real reach are charlierguo's stop-motion clip (6,228), 8co28's sprite sheet (4,874), EHuanglu's storyboard workflow (2,075), Higgsfield's pixel-heroine comparison (1,659), ImagineArt's six-prompt Sunburst benchmark (1,104) and chetaslua's cube-jitter measurement (877). The plan's "X is already getting interesting" section should be rebuilt around those.

Two smaller notes. One index entry (@NguynTu135869) is dated 2026-09-05, three days before launch, so the index's own QA is imperfect. And @ZHO_ZHO_ZHO reports the model "loses the task after 10 consecutive generations", which the API docs echo: "Repeated edits can still change details you intended to preserve... If a region must remain pixel-identical, composite the approved edit into the original image instead of relying on prompting alone." That caps how far the long-edit-chain category can go.

## Facts that change the test plan

- **Cost per test is low.** 12ui's measured numbers for one 12-reference-image UI prompt: Flare medium $0.0437 in 18.7 s; GPT Image 2 medium $0.0739 in 50.7 s; Sunburst max $0.1923 in 80.6 s. Flare and Sunburst cost the same at each quality level; Sunburst is slower. Twenty tests at three iterations each on Flare medium is under $3.
- **Quality levels are low, medium, high, xhigh, max.** The r/codex poster's finding: "Flare medium is the sweet spot"; Sunburst xhigh helps on hard layouts "5% of the time". Record the quality level in every research record.
- **Arbitrary resolutions.** Any WIDTHxHEIGHT with both divisible by 16 and aspect between 1:3 and 3:1, up to 3840x2160. Sizes above 2560x1440 are experimental. The Builder can now emit exact pixel sizes for 2.5 prompts.
- **OpenAI's own prompting rules for 2.5** are the same shape as Depikt's reference-intent guidance: identify each input by number and role, say "change only X" and list what to preserve, put required text in quotes, ask for no extra text, restate constraints on later turns. Depikt's `edit_source` guidance already uses CHANGE ONLY / PRESERVE / MATCH.
- **Depikt does not generate images.** The "generate with 2.5, inspect, revise" loop in the plan has to run in ChatGPT or through the API with the existing `OPENAI_API_KEY`, outside the product. That is fine, but the research record needs a `run_via` field so ChatGPT results and API results are not mixed.

## Verified prompt patterns worth adapting

Short public instructions, recorded verbatim:

| Instruction | Creator | Inputs | Signal |
|---|---|---|---|
| `Move the lamp to the right` | @higgsfield_ai | 1 image | Object relocation with recomputed light |
| `remove slop` | @higgsfield_ai | 1 image | Context understanding stress test |
| `change the composition to this` | @Synthetic_Copy | 2 images (source + sketch) | Sketch as spatial constraint |
| `turn it into a future building` | @peter6759 | 1 sketch | Silhouette-preserving sketch expansion |
| `Pick up the star, raise it, then return it to its original position` | @ctgptlb | 1 image, 9 chained edits | Identity drift over a chain |
| `Photo of a clearing in the woods with lots of green foliage, highly detailed` | @mark_k | none | Noise-artifact test, "results mixed" |
| `make me a realistic iphone photo of a woman in a cafe` | @blueemi99 | none | Short-prompt realism |

Longer third-party templates, to learn from and rewrite rather than copy: God of Prompt's 15 control templates (multi-reference merge, master lock, surgical edit, product campaign, A/B variants, reformat without cropping, UI to campaign asset, artwork to merch, storyboard continuity, 3D A-pose reference, wardrobe swap, interior redesign, localization, sketch to diagram, e-commerce cutout on transparent); the 12ui functional-spec UI prompt; Goodmanprotocol's three poster templates; Banana Prompts' fashion-illustration line; Kiki's 16-frame pixel idle-animation spec; el.cine's character-sheet pair; ImagineArt's six benchmark briefs; Kingy AI's minimal sketch prompt "Turn this rough sketch into a polished finished image. Preserve the composition and every object. Add no text."

## The first batch, re-cut

Sixteen tests instead of twenty. Items are grouped by the Images 2.5 capability they stress, with the Depikt reference intent and Library category each will land in. Four of the plan's items are folded in or dropped, noted at the end.

| # | Test | Capability | Reference intent | Category | Source lineage |
|---|---|---|---|---|---|
| 1 | Move one named object; light and shadows must follow | Precise edit | edit_source | IMAGE EDIT | higgsfield_ai lamp |
| 2 | Master lock: approve an image, then run three narrow edits against it | Multi-turn consistency | edit_source | IMAGE EDIT | godofprompt 2, OpenAI docs |
| 3 | Wardrobe swap from a second image, identity and pose fixed | Multi-reference roles | subject_identity + product_object | INTERIOR/ARCH/FOOD/FASHION | godofprompt 11, OpenAI outfit example |
| 4 | Product photo into a premium studio scene with contact shadow | Reference fidelity | product_object | INTERIOR/ARCH/FOOD/FASHION | godofprompt 4, Flixly sample |
| 5 | Style reference plus product into a UGC frame, two-step | Style transfer | style + product_object | SOCIAL POST | Mho_23 |
| 6 | Four-image merge: identity, clothing, environment, composition | Multi-reference roles | auto (multi) | CINEMATIC SCENE | godofprompt 1, OpenAI docs |
| 7 | UI from a functional-spec screenshot plus two visual donors | Complex instructions | sketch_layout + style | UI MOCKUP | 12ui P06/P08/P12 |
| 8 | UI reformat without cropping to a new aspect ratio | Complex instructions | edit_source | UI MOCKUP | godofprompt 6, 12ui aspect rules |
| 9 | Outfit photo into an ink and watercolor editorial illustration | Style | subject_identity | OPEN-ENDED CREATIVE | bananaprompts |
| 10 | Mid-century Japanese railway tourism poster, exact title text | Text and layout | none | POSTER/COVER | Goodmanprotocol, own rewrite |
| 11 | Cladding-only change on a photographed building | Precise edit | edit_source | INTERIOR/ARCH/FOOD/FASHION | MeltFlex 17 (untested on 2.5) |
| 12 | Sketch plus brief into a poster; then sketch alone as control | Sketch | sketch_layout | POSTER/COVER | Kingy AI, Synthetic_Copy |
| 13 | Isolated product on a true transparent background, alpha checked | Transparency | product_object | INTERIOR/ARCH/FOOD/FASHION | godofprompt 15, OpenAI docs |
| 14 | 4×4 sprite sheet on transparent, then re-test after the 8co28 failure | Transparency + layout | subject_identity | STORYBOARD/MULTI-PANEL | 8co28, Mayz1169 |
| 15 | Nine chained edits on one character, compare frame 1 to frame 9 | Multi-turn consistency | edit_source | STORYBOARD/MULTI-PANEL | ctgptlb, ZHO drift note |
| 16 | Twelve-moment contact sheet of one person in one image | Reference consistency | subject_identity | STORYBOARD/MULTI-PANEL | ZeroZ_JQ (no prompt published) |

Folded or dropped from the plan's 20:

- "Room redesign while preserving geometry" merges into test 11; both are the same "preserve architecture, change only X" pattern and God of Prompt template 12 covers it.
- "Sketch → UI/layout" merges into test 7; the 12ui pattern already treats a screenshot as a layout spec.
- "Exact-text promotional poster" merges into test 10, which carries a quoted title.
- "Restoration/upscale while preserving style" is dropped for now. The only source is one Japanese post (@k_matsumaru); OpenAI does not list restoration as a 2.5 capability, and Depikt has no upscale use case.

## Research record schema

Use this for every candidate, stored in `records.json` beside this file. Fields added to the plan's template are marked.

```text
id, title
source_platform, creator, original_url, posted_at, engagement   (engagement: added)
use_case, capability                                            (capability: which 2.5 claim it stresses)
reference_images_required, original_prompt_public, original_prompt_verbatim
why_interesting
depikt_adaptation                                               (our rewrite; empty until written)
model_used            chatgpt | flare | sunburst
quality               low | medium | high | xhigh | max          (added)
run_via               chatgpt | api                             (added)
test_status           untested | pass | fail | revised
our_result            path or URL to the output
failure_notes
final_recipe
target_model          gpt-image-2.5
```

Rules the audit surfaced: record the quality level and run path every time; store the source's failure notes, not just ours; never mark `pass` from a creator's screenshot; if the verbatim prompt is longer than a sentence, the collection entry must be our adaptation, with the creator credited in `why_it_works`.

## Sources

Primary: [OpenAI announcement](https://openai.com/index/introducing-chatgpt-images-2-5/) · [Image prompting guide](https://developers.openai.com/api/docs/guides/image-prompting) · [Sunburst model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) · [Developer community thread](https://community.openai.com/t/introducing-gpt-images-2-5-in-the-api-and-chatgpt/1395897) · [awesome-gpt-image-2-5-prompts](https://github.com/magiccreator-ai/awesome-gpt-image-2-5-prompts) · [12ui comparison](https://12ui.com/gpt-image-2.5-vs-2) · [r/codex thread](https://www.reddit.com/r/codex/comments/1wb8p1g/gpt_image_25_comparison_for_ui_generation/) · [r/accelerate thread](https://www.reddit.com/r/accelerate/comments/1waz5tn/chatgpt_image_2_vs_image_25_holy_openai_is_on/)

X posts: [God of Prompt 15 templates](https://x.com/godofprompt/status/2097520160424993007) · [Banana Prompts fashion illustration](https://x.com/bananaprompts/status/2097453650100547924) · [Goodmanprotocol Showa poster](https://x.com/Goodmanprotocol/status/2097542746273726753) · [Higgsfield lamp](https://x.com/higgsfield_ai/status/2097515081802379736) · [Higgsfield remove slop](https://x.com/higgsfield_ai/status/2097556101155955113) · [Mho_23 UGC workflow](https://x.com/Mho_23/status/2097483045221917131) · [8co28 sprite sheet](https://x.com/8co28/status/2097423580229521849) · [ctgptlb nine edits](https://x.com/ctgptlb/status/2097479691368337900) · [ZHO drift](https://x.com/ZHO_ZHO_ZHO/status/2097573152675316038) · [ImagineArt benchmark](https://x.com/ImagineArt_X/status/2097520459969601977)

Secondary: [Kingy AI sketch test](https://kingy.ai/blog/chatgpt-images-2-5-sketch-test/) · [MeltFlex architecture prompts](https://www.meltflexai.com/blog/chatgpt-images-2-5-architecture-prompts) · [Flixly](https://www.flixly.ai/blog/gpt-image-2-5-flixly) · [Simon Willison](https://simonwillison.net/2026/Sep/8/introducing-chatgpt-images-25/) · [Promptessor guide](https://promptessor.com/blog/gpt-image-2-5-prompting-guide)

## Addendum, 2026-09-09: the OpenAI announcement's own examples

Every still and video on the announcement page was viewed and catalogued in [openai-announcement-inventory.md](openai-announcement-inventory.md). Two things changed the plan. First, the "Full-body edits" reel contains OpenAI's own 100-edit benchmark with the prompt for every edit; 98 are transcribed verbatim in `openai-100-edits.json` and become the Critic's expected-high-score layer plus five Library recipes. Second, the travel-infographic reel shows OpenAI's five multi-turn text-edit prompts verbatim, which set the shape for our master-lock and text-edit guidance. The batch grows from 16 to 21 tests (3b, 12b, 17–21) and gains a nine-image launch-gallery recipe set; `records.json` now has 36 records.
