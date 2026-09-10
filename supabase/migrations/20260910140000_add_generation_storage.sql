-- Phase 5 (native image generation), part 3: private storage bucket and
-- ownership policies for generated images and reference uploads.
--
-- NOT APPLIED TO PRODUCTION. Same review status as the two prior
-- 2026-09-10 generation migrations.
--
-- Paths are always users/<user-id>/... (src/lib/generation/storage-paths.ts
-- is the only code allowed to construct one, and it refuses to build a path
-- from anything unsafe). Ownership is enforced purely from that prefix,
-- using Supabase's storage.foldername() helper — the same mechanism used
-- for per-user document storage on this platform.

INSERT INTO storage.buckets (id, name, public)
VALUES ('generation-assets', 'generation-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Read: a user may read only objects under their own users/<uid>/ prefix.
DROP POLICY IF EXISTS "generation_assets_owner_read" ON storage.objects;
CREATE POLICY "generation_assets_owner_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'generation-assets'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Write: a user may upload only under their own users/<uid>/ prefix. This is
-- the same authenticated-client write the generation_jobs/image_versions
-- writes use (see 20260910130000's architecture note) — no service role.
DROP POLICY IF EXISTS "generation_assets_owner_insert" ON storage.objects;
CREATE POLICY "generation_assets_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'generation-assets'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- No UPDATE/DELETE policy: outputs are immutable (see image_versions),
-- and reference uploads are write-once for V1. Add a scoped delete policy
-- only if/when the product needs users to remove their own references.

COMMENT ON POLICY "generation_assets_owner_read" ON storage.objects IS
  'Ownership is the users/<auth.uid()>/ path prefix built by src/lib/generation/storage-paths.ts — never trust a client-supplied path.';
