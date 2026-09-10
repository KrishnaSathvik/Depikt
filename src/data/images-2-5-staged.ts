/**
 * ChatGPT Images 2.5 collection — STAGING (work in progress only).
 *
 * Supabase `curated_prompts` is the approved library. This file holds only
 * draft / test_ready / tested records. `fetchLibrary` would merge an
 * approved record from here as a fallback, but the invariant is that
 * approved records are promoted to the database (run
 * scripts/export-staged-images-2-5.ts, then the SQL) and deleted from this
 * file in the same change. Batch 1 (2026-09-09): 23 promoted, 1 held.
 * Batch 2 (2026-09-10): 20 Depikt originals written and generated with
 * gpt-image-2.5-sunburst (high); all 20 promoted via
 * supabase/insert-images-2-5-batch2-staged.sql. Held-record note: base2 /
 * CREATED2 are defined again when a batch 3 is staged.
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
  /** Request a transparent PNG from the API (cutouts, sticker sheets). */
  transparent_background?: boolean;
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
  // Work in progress only. Approved records are promoted to Supabase
  // (see supabase/insert-images-2-5-batch1-staged.sql) and removed from here.

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
];

/** Staged records that are approved and may appear in the public library. */
export function publicStagedPrompts(): StagedPrompt[] {
  return stagedImages25Prompts.filter((p) => p.status === "approved");
}
