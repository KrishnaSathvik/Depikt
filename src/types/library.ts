/**
 * Unified shape that the Library renders, regardless of whether a row came
 * from `curated_prompts` (source='example' | 'curated') or `prompts`
 * (source='user').
 *
 * Why a single shape? The Library page should not branch on source for
 * rendering. Source only matters for filtering ("My prompts" view) and for
 * the small attribution line at the bottom of the detail dialog.
 */

import type { TargetModel } from '@/lib/target-model';

export type PromptSource = 'example' | 'curated' | 'user';

export interface LibraryPrompt {
  id: string;
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
   * collection is 'gpt-image-2'; future entries are 'gpt-image-2.5'.
   * Always populated on read (defaults to the legacy collection).
   */
  target_model?: TargetModel;
  created_at?: string;
  // Owner info, only present for source='user' rows.
  user_id?: string | null;
}
