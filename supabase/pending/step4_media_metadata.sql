-- PREPARED ONLY. Apply after Steps 1–3, at the explicitly approved release.
-- Existing private version ownership and insert policies remain unchanged.
ALTER TABLE public.image_versions ADD COLUMN IF NOT EXISTS media_metadata jsonb;
COMMENT ON COLUMN public.image_versions.media_metadata IS 'Server-validated native media format, byte size, vector dimensions and GIF animation metadata';
GRANT SELECT ON public.image_versions TO authenticated;
GRANT ALL ON public.image_versions TO service_role;

-- Atomic token-map merge preserves the immutable signed execution document.
CREATE OR REPLACE FUNCTION public.merge_generation_execution_tokens(p_session_id uuid, p_tokens jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(p_tokens) <> 'object' OR octet_length(p_tokens::text) > 16384 THEN RAISE EXCEPTION 'Invalid token map'; END IF;
  UPDATE public.generation_sessions SET plan_json = jsonb_set(plan_json, '{executionTokensEnc}', COALESCE(plan_json->'executionTokensEnc', '{}'::jsonb) || p_tokens)
   WHERE id = p_session_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.merge_generation_execution_tokens(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_generation_execution_tokens(uuid, jsonb) TO authenticated;