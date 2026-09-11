-- Profile + Creations account phase: profiles table, generated username,
-- deterministic avatar, and the trigger that creates one automatically for
-- every new auth.users row.
--
-- NOT APPLIED TO PRODUCTION. Same review status as the 2026-09-10/11
-- generation and commercial migrations -- prepared for the Supabase SQL
-- Editor, tested on a scratch Postgres via scripts/test-profiles-migration.sh
-- (tests/sql/profiles.test.sql holds the invariants). Additive: does not
-- touch credit_accounts, billing_accounts, or any generation table.
--
-- Word lists mirror src/lib/profile/username.ts (ADJECTIVES/NOUNS) --
-- tests/unit/profile-username.test.ts checks the two stay in sync. Real
-- username generation always runs here (ensure_profile), never in the
-- browser; the TS copy exists for validation/preview and tests only.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id        uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       text NOT NULL,
  display_name   text,
  avatar_seed    text NOT NULL,
  avatar_variant text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  -- Case-insensitive uniqueness via a unique index on lower(username), not a
  -- UNIQUE column constraint -- "quietOrbit" and "quietorbit" must collide.
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles_username_lower_idx') THEN
    CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_format') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format
      CHECK (
        username = lower(username)
        AND length(username) BETWEEN 3 AND 24
        AND username ~ '^[a-z0-9]([a-z0-9-]{0,22}[a-z0-9])?$'
        AND username NOT LIKE '%--%'
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_display_name_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_length
      CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 60);
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- No public read: a profile is visible only to the account that owns it.
-- (If usernames ever become public, add a narrow SELECT policy exposing
-- only username/display_name/avatar_* then -- not now.)
DROP POLICY IF EXISTS "profiles_owner_read" ON public.profiles;
CREATE POLICY "profiles_owner_read" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- No client INSERT/DELETE policy: rows are created only by ensure_profile()
-- (SECURITY DEFINER) and removed only by the auth.users cascade.

-- RLS's row-level WITH CHECK can't restrict which *columns* an UPDATE
-- touches (same class of gap as generation_jobs -- see
-- 20260910130000_add_generation_job_lifecycle.sql). Lock identity columns;
-- only username/display_name/avatar_seed/avatar_variant/updated_at may change.
CREATE OR REPLACE FUNCTION public.prevent_profile_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'profiles: user_id and created_at are immutable after creation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_identity_lock ON public.profiles;
CREATE TRIGGER profiles_identity_lock
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_identity_change();

-- ==========================================================================
-- Reserved usernames -- a small, explicit list, not a large blacklist.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.is_reserved_username(p_username text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(p_username) IN (
    'admin', 'administrator', 'depikt', 'support', 'help', 'api', 'billing',
    'account', 'root', 'moderator', 'official', 'security', 'privacy',
    'terms', 'library', 'prompt', 'gallery', 'blog', 'templates', 'pricing',
    'sign-in', 'sign-up', 'mcp', 'www'
  )
$$;

-- ==========================================================================
-- Deterministic username generation -- mirrors
-- src/lib/profile/username.ts's hashToIndex/generateUsernameCandidate.
-- Uses Postgres's md5 as the hash source (not the app's djb2 -- doesn't
-- need to match bit-for-bit, only needs to be deterministic per
-- user_id+attempt and roughly uniform, since collisions are handled by the
-- retry loop in ensure_profile regardless).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.username_word_index(p_key text, p_modulo integer) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT ('x' || substr(md5(p_key), 1, 8))::bit(32)::bigint % p_modulo
$$;

CREATE OR REPLACE FUNCTION public.generate_username_candidate(p_user_id uuid, p_attempt integer DEFAULT 0)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_adjectives text[] := ARRAY[
    'quiet','silver','soft','paper','pixel','amber','cedar','coral','dusty','faint',
    'gentle','hollow','ivory','jade','lucid','mellow','misty','muted','nimble','opal',
    'pale','rosy','rustic','slate'
  ];
  v_nouns text[] := ARRAY[
    'orbit','frame','comet','fox','moon','harbor','canyon','lantern','meadow','ridge',
    'willow','ember','grove','current','signal','compass','cove','drift','echo','field',
    'glacier','horizon','island','juniper'
  ];
  v_adj text;
  v_noun text;
  v_suffix integer;
BEGIN
  v_adj := v_adjectives[public.username_word_index(p_user_id::text || ':adj:' || p_attempt, array_length(v_adjectives, 1)) + 1];
  v_noun := v_nouns[public.username_word_index(p_user_id::text || ':noun:' || p_attempt, array_length(v_nouns, 1)) + 1];
  v_suffix := public.username_word_index(p_user_id::text || ':suffix:' || p_attempt, 9000) + 1000;
  RETURN v_adj || '-' || v_noun || '-' || v_suffix::text;
END;
$$;

-- ==========================================================================
-- Deterministic default avatar variant -- mirrors
-- src/lib/profile/avatar.ts's deriveDefaultAvatarVariant. Only used as the
-- initial value; the picker (client-side) writes its own chosen variant.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.default_avatar_variant(p_user_id uuid) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT 's' || public.username_word_index(p_user_id::text || ':avatar:symbol', 24)::text
      || '-b' || public.username_word_index(p_user_id::text || ':avatar:bg', 10)::text
      || '-c' || public.username_word_index(p_user_id::text || ':avatar:composition', 3)::text
$$;

-- ==========================================================================
-- ensure_profile -- idempotent: returns the existing row if one already
-- exists, otherwise allocates a unique username (retrying on collision) and
-- creates one. Callable from the signup trigger AND lazily from the app for
-- any account created before this migration shipped (see the app's
-- GET /api/account/profile, which calls this before reading).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.ensure_profile(p_user_id uuid, p_display_name text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles;
  v_username text;
  v_display text;
  v_attempt integer := 0;
BEGIN
  -- A caller with no JWT at all is either the auth.users trigger (internal,
  -- trusted) or a service-role script; only an *authenticated* caller
  -- asking for someone else's id is rejected.
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'ensure_profile: not authorized for %', p_user_id;
  END IF;

  SELECT * INTO v_row FROM public.profiles WHERE user_id = p_user_id;
  IF FOUND THEN RETURN v_row; END IF;

  v_display := NULLIF(trim(both from p_display_name), '');
  IF v_display IS NULL OR length(v_display) > 60 THEN v_display := 'Depikt Creator'; END IF;

  LOOP
    v_username := public.generate_username_candidate(p_user_id, v_attempt);
    BEGIN
      INSERT INTO public.profiles (user_id, username, display_name, avatar_seed, avatar_variant)
      VALUES (p_user_id, v_username, v_display, p_user_id::text, public.default_avatar_variant(p_user_id))
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt > 25 THEN
        RAISE EXCEPTION 'ensure_profile: could not allocate a unique username for %', p_user_id;
      END IF;
    END;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_profile(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile(uuid, text) TO authenticated, service_role;

-- Trigger on auth.users, independent of on_auth_user_created_depikt (the
-- starter-credit grant in 20260911100000). Each trigger's failure is caught
-- inside its own function and never blocks account creation or the other
-- trigger -- a profile created with credits missing, or credits granted
-- with a profile missing, both self-heal: grant_starter_credits and
-- ensure_profile are each idempotent and safe to call again later (the app
-- calls ensure_profile lazily from GET /api/account/profile regardless).
CREATE OR REPLACE FUNCTION public.handle_new_depikt_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.ensure_profile(NEW.id, NEW.raw_user_meta_data->>'full_name');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_depikt_profile: profile creation failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_depikt_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_depikt_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_depikt_profile();

REVOKE ALL ON FUNCTION public.handle_new_depikt_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_reserved_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_reserved_username(text) TO authenticated, service_role;

COMMENT ON TABLE public.profiles IS
  'One row per auth user: username, display_name, avatar_seed/variant. Never plan/credits/Stripe ids -- those stay in credit_accounts/billing_accounts. Not publicly readable.';
COMMENT ON COLUMN public.profiles.avatar_seed IS
  'Always the user_id (kept as its own column, not re-derived, so a future non-user-id seed source is a data migration, not a schema change).';
COMMENT ON COLUMN public.profiles.avatar_variant IS
  'Compact "s<i>-b<i>-c<i>" symbol/background/composition index string; see src/lib/profile/avatar.ts. Never rendered SVG.';
COMMENT ON FUNCTION public.ensure_profile IS
  'Idempotent: returns the existing profile or creates one with a generated, collision-free username. Called by the signup trigger and lazily by the app for pre-migration accounts.';
