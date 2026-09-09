import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LibraryPrompt, PromptSource } from '@/types/library';
import { normalizeTargetModel } from '@/lib/target-model';
import {
  filterPublic,
  mergeById,
  normalizeReferenceMode,
  normalizeSourceType,
  normalizeStatus,
} from '@/lib/library-metadata';
import { publicStagedPrompts } from '@/data/images-2-5-staged';

const IMAGO_URL =
  'https://chatgpt.com/g/g-69e7de729cb48191a6aa83ec3af8a6cb-imago' +
  '?utm_source=depikt&utm_medium=library';

/**
 * Read curated content (examples + X-sourced) from `curated_prompts`.
 * Public read — no auth required.
 */
const CURATED_COLUMNS =
  'id, title, category, user_input, prompt, why_it_works, source, tags, thumbnail_url, created_at';
// Phase 3 column.
const MODEL_COLUMNS = `${CURATED_COLUMNS}, target_model`;
// Phase 4 provenance / review columns (migration 20260909120000).
const PROVENANCE_COLUMNS =
  `${MODEL_COLUMNS}, slug, source_type, source_creator, source_url, source_notes, status, ` +
  'generation_ready, gallery_ready, needs_reference_images, reference_mode, review_notes, ' +
  'result_count, updated_at';

async function fetchCurated(): Promise<LibraryPrompt[]> {
  type Row = Record<string, unknown>;
  let rows: Row[] | null = null;
  let error: { code?: string; message?: string } | null = null;

  // Try the newest column set first and fall back one migration at a time,
  // so a database that has not applied a migration still serves the library.
  for (const columns of [PROVENANCE_COLUMNS, MODEL_COLUMNS, CURATED_COLUMNS]) {
    const res = await supabase
      .from('curated_prompts')
      .select(columns)
      .order('created_at', { ascending: false });
    rows = res.data as Row[] | null;
    error = res.error;
    if (!error || !isUndefinedColumn(error)) break;
  }

  if (error) throw error;
  const normalized = (rows ?? []).map((r): LibraryPrompt => normalizeCuratedRow(r));
  // Only approved rows are public. Rows without the status column read as approved.
  return filterPublic(normalized);
}

function normalizeCuratedRow(r: Record<string, unknown>): LibraryPrompt {
  const base = r as unknown as LibraryPrompt;
  return {
    ...base,
    slug: typeof r.slug === 'string' && r.slug ? r.slug : base.id.replace(/^curated-/, ''),
    target_model: normalizeTargetModel(r.target_model),
    source_type: normalizeSourceType(r.source_type),
    status: normalizeStatus(r.status),
    reference_mode: normalizeReferenceMode(r.reference_mode),
    generation_ready: r.generation_ready === true,
    gallery_ready: r.gallery_ready === true,
    needs_reference_images: r.needs_reference_images === true,
    result_count: typeof r.result_count === 'number' ? r.result_count : 0,
  };
}

function isUndefinedColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42703' ||
    /target_model|source_type|status|reference_mode|generation_ready|gallery_ready|result_count|updated_at|slug/.test(
      error.message ?? ''
    )
  );
}

/**
 * Read user prompts that are either (a) public, or (b) owned by the current user.
 * RLS handles the filter; we just select everything we're allowed to see.
 *
 * The `prompts` table uses different column names than the unified shape:
 *   - input_text  -> user_input
 *   - output_prompt -> prompt
 *   - category    -> category
 *   - variants    -> variants
 * We normalize on read.
 */
async function fetchUserPrompts(): Promise<LibraryPrompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select(
      'id, title, category, input_text, output_prompt, why_it_works, is_public, user_id, tags, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    // 401/403 just means logged-out user with no public rows visible — not fatal.
    if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map(
    (r: any): LibraryPrompt => ({
      id: r.id,
      title: r.title ?? deriveTitle(r.input_text, r.id),
      category: r.category ?? 'Open-Ended Creative',
      prompt: r.output_prompt,
      user_input: r.input_text,
      why_it_works: r.why_it_works,
      source: 'user',
      tags: r.tags ?? [],
      // User prompts predate model versioning; treat them as the legacy collection.
      target_model: normalizeTargetModel(r.target_model),
      created_at: r.created_at,
      user_id: r.user_id,
    })
  );
}

function deriveTitle(input: string | null | undefined, id: string): string {
  if (!input) return id.slice(0, 8);
  return input.slice(0, 60) + (input.length > 60 ? '…' : '');
}

/**
 * Hand-picked prompts that appear first on page 1 (in this order).
 * Chosen for visual impact and category diversity.
 */
const FEATURED_IDS: string[] = [
  'curated-expressive-motion-study',
  'curated-anime-streetwear-poster-system',
  'curated-ai-casual-selfie',
  'curated-architectural-minimalist-poster',
  'curated-retro-mars-tennis',
  'curated-double-exposure-editorial',
  'curated-watercolor-cafe-illustration',
  'curated-historical-illustrated-poster',
  'curated-rengoku-anime-poster',
  'curated-national-identity-poster',
  'curated-food-brand-identity-poster',
  'curated-anime-character-poster',
];

/**
 * Module-level cache. Library content is curated and changes rarely, so we
 * keep the result in memory for the lifetime of the tab. Subsequent visits
 * to `/` render instantly from cache.
 */
let _libraryCache: LibraryPrompt[] | null = null;
let _libraryInflight: Promise<LibraryPrompt[]> | null = null;

// Clear module cache on HMR so dev reloads fetch fresh data.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _libraryCache = null;
    _libraryInflight = null;
  });
}

export function getCachedLibrary(): LibraryPrompt[] | null {
  return _libraryCache;
}

/**
 * Single read for the Library page.
 *
 * Anonymous users (the default after the auth strip) can't see anything in
 * `prompts` due to RLS, so we skip that query entirely and only hit
 * `curated_prompts`. Logged-in users still get the merged view.
 */
export async function fetchLibrary(): Promise<LibraryPrompt[]> {
  if (_libraryCache) return _libraryCache;
  if (_libraryInflight) return _libraryInflight;

  _libraryInflight = (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const isAuthed = !!sessionData?.session;

    const [curated, user] = await Promise.all([
      fetchCurated(),
      isAuthed ? fetchUserPrompts() : Promise.resolve([] as LibraryPrompt[]),
    ]);

    // Display order: featured first (in curated order), then remaining
    // thumbnails newest-first, then no-thumbnail cards at the end.
    const byDateDesc = (a: LibraryPrompt, b: LibraryPrompt) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? '');

    // Images 2.5 records staged in the repo join the library once approved.
    // A database row with the same id wins, so promotion never double-lists.
    const all = [...mergeById(curated, publicStagedPrompts()), ...user];
    const featuredSet = new Set(FEATURED_IDS);
    const featured: LibraryPrompt[] = [];
    for (const id of FEATURED_IDS) {
      const p = all.find((x) => x.id === id);
      if (p) featured.push(p);
    }
    const rest = all.filter((p) => !featuredSet.has(p.id));
    const withThumb = rest.filter((p) => !!p.thumbnail_url).sort(byDateDesc);
    const withoutThumb = rest.filter((p) => !p.thumbnail_url).sort(byDateDesc);

    const merged = [...featured, ...withThumb, ...withoutThumb];
    _libraryCache = merged;
    return merged;
  })();

  try {
    return await _libraryInflight;
  } finally {
    _libraryInflight = null;
  }
}

/**
 * Copy prompt + open Imago in a new tab.
 * Custom GPTs don't accept ?q= URL params, so we copy and instruct the user to paste.
 */
export async function openInImago(prompt: string) {
  try {
    await navigator.clipboard.writeText(prompt);
  } catch {
    toast.error('Couldn\'t copy. Use the Copy button first, then open Imago.');
  }
  window.open(IMAGO_URL, '_blank', 'noopener,noreferrer');
}

/**
 * Just copy. Used by the standalone Copy button on each card.
 */
export async function copyPrompt(prompt: string) {
  try {
    await navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied');
  } catch {
    toast.error('Couldn\'t copy');
  }
}

/**
 * Favorites: thin wrappers around the favorites table. Auth-required;
 * caller checks user state before invoking.
 */
export async function toggleFavorite(
  userId: string,
  promptId: string,
  promptSource: PromptSource,
  currentlyFavorited: boolean
) {
  // The favorites table only stores 'curated' or 'user' as source.
  // Examples are still stored in curated_prompts so they map to 'curated' here.
  const dbSource = promptSource === 'user' ? 'user' : 'curated';

  if (currentlyFavorited) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .match({ user_id: userId, prompt_id: promptId, prompt_source: dbSource });
    if (error) {
      toast.error('Couldn\'t unfavorite');
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, prompt_id: promptId, prompt_source: dbSource });
    if (error) {
      toast.error('Couldn\'t favorite');
      throw error;
    }
  }
}

export async function fetchFavoriteIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('prompt_id')
    .eq('user_id', userId);
  if (error) return new Set();
  return new Set((data ?? []).map((r: any) => r.prompt_id));
}
