-- Profile → Creations: owners may delete a generated image. Rows stay
-- write-once (no UPDATE); this only adds a scoped DELETE. Child edits keep
-- their own rows — parent/source FKs null out instead of cascading.
--
-- Storage delete is limited to users/<uid>/sessions/... (generated outputs).
-- Reference/mask/entity objects keep their existing policies.

ALTER TABLE public.image_versions
  DROP CONSTRAINT IF EXISTS image_versions_parent_version_id_fkey;
ALTER TABLE public.image_versions
  ADD CONSTRAINT image_versions_parent_version_id_fkey
  FOREIGN KEY (parent_version_id)
  REFERENCES public.image_versions(id)
  ON DELETE SET NULL;

ALTER TABLE public.generation_jobs
  DROP CONSTRAINT IF EXISTS generation_jobs_source_version_id_fkey;
ALTER TABLE public.generation_jobs
  ADD CONSTRAINT generation_jobs_source_version_id_fkey
  FOREIGN KEY (source_version_id)
  REFERENCES public.image_versions(id)
  ON DELETE SET NULL;

DROP POLICY IF EXISTS "image_versions_owner_delete" ON public.image_versions;
CREATE POLICY "image_versions_owner_delete" ON public.image_versions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "generation_assets_owner_delete_sessions" ON storage.objects;
CREATE POLICY "generation_assets_owner_delete_sessions" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'generation-assets'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'sessions'
  );

COMMENT ON POLICY "image_versions_owner_delete" ON public.image_versions IS
  'Owner may remove a version from Profile → Creations. Inserts stay server-only.';
