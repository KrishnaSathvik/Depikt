/**
 * Unified shape that the Library renders, regardless of whether a row came
 * from `curated_prompts` (source='example' | 'curated') or `prompts`
 * (source='user').
 *
 * Why a single shape? The Library page should not branch on source for
 * rendering. Source only matters for filtering ("My prompts" view) and for
 * the small attribution line at the bottom of the detail dialog.
 */

import type { TargetModel } from "@/lib/target-model";
import type { PromptStatus, ReferenceMode, SourceType } from "@/lib/library-metadata";

export type PromptSource = "example" | "curated" | "user";

export interface LibraryPrompt {
  id: string;
  /** URL-safe handle; legacy rows derive it from the id on read. */
  slug?: string;
  title: string;
  category: string;
  prompt: string;
  user_input?: string | null;
  why_it_works?: string | null;
  source: PromptSource;
  tags?: string[];
  thumbnail_url?: string | null;
  /**
   * Image model the prompt was written for. The original 500-prompt
   * collection is 'gpt-image-2'; Images 2.5 entries are 'gpt-image-2.5'.
   * Always populated on read (defaults to the legacy collection).
   */
  target_model?: TargetModel;

  // ---- provenance (Images 2.5 collection; absent on legacy rows) ----
  /** Where the prompt came from. Legacy rows read as 'depikt_original'. */
  source_type?: SourceType;
  /** Creator or organisation credited (existing DB column). */
  source_creator?: string | null;
  source_url?: string | null;
  source_notes?: string | null;

  // ---- review pipeline ----
  /** Legacy rows and rows without the column read as 'approved'. */
  status?: PromptStatus;
  /** Complete enough for the generation phase to run it. */
  generation_ready?: boolean;
  /** Has a reviewed result image and may appear in the Gallery. */
  gallery_ready?: boolean;
  needs_reference_images?: boolean;
  reference_mode?: ReferenceMode;
  /** What the next phase should verify. */
  review_notes?: string | null;
  /** Number of generated results attached so far. */
  result_count?: number;

  created_at?: string;
  updated_at?: string;
  // Owner info, only present for source='user' rows.
  user_id?: string | null;
}
