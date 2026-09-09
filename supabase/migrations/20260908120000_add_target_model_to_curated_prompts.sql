-- Phase 3 (ChatGPT Images 2.5 migration): version library prompts by image model.
--
-- The existing curated collection was written for GPT Image 2 and is left
-- byte-for-byte unchanged; every current row is backfilled to 'gpt-image-2'.
-- Future ChatGPT Images 2.5 entries insert with target_model = 'gpt-image-2.5'.
-- Idempotent: safe to re-run.

ALTER TABLE public.curated_prompts
  ADD COLUMN IF NOT EXISTS target_model text NOT NULL DEFAULT 'gpt-image-2';

-- Backfill defensively (covers rows that predate the column default being applied).
UPDATE public.curated_prompts
   SET target_model = 'gpt-image-2'
 WHERE target_model IS NULL OR target_model = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'curated_prompts_target_model_check'
  ) THEN
    ALTER TABLE public.curated_prompts
      ADD CONSTRAINT curated_prompts_target_model_check
      CHECK (target_model IN ('gpt-image-2', 'gpt-image-2.5'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS curated_prompts_target_model_idx
  ON public.curated_prompts (target_model);

COMMENT ON COLUMN public.curated_prompts.target_model IS
  'Image model the prompt was written for: gpt-image-2 (original 500-prompt collection) or gpt-image-2.5.';
