-- Phase 4 (ChatGPT Images 2.5 collection): provenance, review status and
-- reference metadata for library prompts.
--
-- One library, two collections. The existing GPT Image 2 rows are untouched
-- and read as approved / depikt_original / no reference. New Images 2.5 rows
-- insert with an explicit status and are hidden from the public library
-- until status = 'approved'.
-- Idempotent: safe to re-run.

ALTER TABLE public.curated_prompts
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'depikt_original',
  ADD COLUMN IF NOT EXISTS source_notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS generation_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gallery_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_reference_images boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS result_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Legacy rows: derive a slug from the id (strip the 'curated-' prefix).
UPDATE public.curated_prompts
   SET slug = regexp_replace(id, '^curated-', '')
 WHERE slug IS NULL OR slug = '';

-- Legacy rows are live content. Backfill defensively.
UPDATE public.curated_prompts
   SET status = 'approved'
 WHERE status IS NULL OR status = '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curated_prompts_source_type_check') THEN
    ALTER TABLE public.curated_prompts
      ADD CONSTRAINT curated_prompts_source_type_check
      CHECK (source_type IN ('official_prompt', 'official_inspired', 'community_inspired', 'depikt_original'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curated_prompts_status_check') THEN
    ALTER TABLE public.curated_prompts
      ADD CONSTRAINT curated_prompts_status_check
      CHECK (status IN ('draft', 'test_ready', 'tested', 'approved'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curated_prompts_reference_mode_check') THEN
    ALTER TABLE public.curated_prompts
      ADD CONSTRAINT curated_prompts_reference_mode_check
      CHECK (reference_mode IN ('none', 'identity', 'style', 'product', 'composition', 'sketch', 'multi_reference', 'edit_source'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curated_prompts_slug_key') THEN
    ALTER TABLE public.curated_prompts
      ADD CONSTRAINT curated_prompts_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS curated_prompts_status_idx ON public.curated_prompts (status);
CREATE INDEX IF NOT EXISTS curated_prompts_source_type_idx ON public.curated_prompts (source_type);

COMMENT ON COLUMN public.curated_prompts.source_type IS
  'official_prompt (OpenAI published the prompt) | official_inspired (OpenAI showed the output only) | community_inspired | depikt_original.';
COMMENT ON COLUMN public.curated_prompts.status IS
  'draft | test_ready | tested | approved. Only approved rows are shown in the public library.';
COMMENT ON COLUMN public.curated_prompts.reference_mode IS
  'none | identity | style | product | composition | sketch | multi_reference | edit_source.';
COMMENT ON COLUMN public.curated_prompts.review_notes IS
  'What the generation/review phase should verify before promoting the row.';
