-- Profile invariants, run by scripts/test-profiles-migration.sh after the
-- generation + commercial-credit + profile migrations. Every block raises
-- on failure (ON_ERROR_STOP).

-- 1. New auth user -> profile created automatically, once, with a
--    generated username and a deterministic default avatar.
DO $$
DECLARE u uuid := gen_random_uuid(); p record; n int;
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (u, 'p1@test.local', '{"full_name": "Ada Lovelace"}'::jsonb);
  SELECT * INTO p FROM public.profiles WHERE user_id = u;
  ASSERT FOUND, 'profile row must exist after signup';
  ASSERT p.display_name = 'Ada Lovelace', 'display_name comes from OAuth metadata';
  ASSERT p.username ~ '^[a-z]+-[a-z]+-[0-9]{4}$', format('username must match adjective-noun-suffix, got %s', p.username);
  ASSERT p.avatar_seed = u::text, 'avatar_seed defaults to the user id';
  ASSERT p.avatar_variant ~ '^s[0-9]+-b[0-9]+-c[0-9]+$', 'avatar_variant must be well-formed';
  ASSERT p.avatar_variant = public.default_avatar_variant(u), 'default avatar is deterministic from user id';
  -- calling ensure_profile again must be a no-op (idempotent)
  PERFORM public.ensure_profile(u, 'Someone Else');
  SELECT count(*) INTO n FROM public.profiles WHERE user_id = u;
  ASSERT n = 1, 'ensure_profile must not create a second row';
  SELECT * INTO p FROM public.profiles WHERE user_id = u;
  ASSERT p.display_name = 'Ada Lovelace', 'ensure_profile must not overwrite an existing display_name';
END $$;

-- 2. No OAuth name -> falls back to "Depikt Creator".
DO $$
DECLARE u uuid := gen_random_uuid(); p record;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'p2@test.local');
  SELECT * INTO p FROM public.profiles WHERE user_id = u;
  ASSERT p.display_name = 'Depikt Creator', format('expected fallback display name, got %s', p.display_name);
END $$;

-- 3. Two different users never collide on username (spot check across a
--    small batch -- the real guarantee is the unique index + retry loop).
DO $$
DECLARE i int; u uuid; n int;
BEGIN
  FOR i IN 1..25 LOOP
    u := gen_random_uuid();
    INSERT INTO auth.users (id, email) VALUES (u, 'batch' || i || '@test.local');
  END LOOP;
  SELECT count(DISTINCT lower(username)) INTO n FROM public.profiles;
  ASSERT n = (SELECT count(*) FROM public.profiles), 'every username must be unique (case-insensitive)';
END $$;

-- 4. Uniqueness is enforced by the DB (not just the app), and the format
--    constraint already forces canonical lowercase storage -- a mixed-case
--    value is rejected outright rather than silently colliding.
DO $$
DECLARE u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); rejected boolean := false;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u1, 'ci1@test.local');
  INSERT INTO auth.users (id, email) VALUES (u2, 'ci2@test.local');
  UPDATE public.profiles SET username = 'quiet-orbit-4821' WHERE user_id = u1;
  BEGIN
    UPDATE public.profiles SET username = 'quiet-orbit-4821' WHERE user_id = u2;
  EXCEPTION WHEN unique_violation THEN
    rejected := true;
  END;
  ASSERT rejected, 'a duplicate username must be rejected';

  rejected := false;
  BEGIN
    UPDATE public.profiles SET username = 'QuietOrbit4821' WHERE user_id = u2;
  EXCEPTION WHEN check_violation THEN
    rejected := true;
  END;
  ASSERT rejected, 'mixed-case usernames must be rejected at the format constraint, never stored ambiguously';
END $$;

-- 5. Format/reserved constraints are enforced at the DB layer.
DO $$
DECLARE u uuid := gen_random_uuid(); rejected boolean;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'fmt@test.local');

  rejected := false;
  BEGIN
    UPDATE public.profiles SET username = 'ab' WHERE user_id = u; -- too short
  EXCEPTION WHEN check_violation THEN rejected := true; END;
  ASSERT rejected, 'usernames under 3 chars must be rejected';

  rejected := false;
  BEGIN
    UPDATE public.profiles SET username = '-leading' WHERE user_id = u;
  EXCEPTION WHEN check_violation THEN rejected := true; END;
  ASSERT rejected, 'leading hyphen must be rejected';

  rejected := false;
  BEGIN
    UPDATE public.profiles SET username = 'trailing-' WHERE user_id = u;
  EXCEPTION WHEN check_violation THEN rejected := true; END;
  ASSERT rejected, 'trailing hyphen must be rejected';

  rejected := false;
  BEGIN
    UPDATE public.profiles SET username = 'has--double' WHERE user_id = u;
  EXCEPTION WHEN check_violation THEN rejected := true; END;
  ASSERT rejected, 'repeated hyphen must be rejected';

  rejected := false;
  BEGIN
    UPDATE public.profiles SET username = 'Has_Caps' WHERE user_id = u;
  EXCEPTION WHEN check_violation THEN rejected := true; END;
  ASSERT rejected, 'non-lowercase/underscore must be rejected';

  ASSERT public.is_reserved_username('Admin'), 'reserved check must be case-insensitive';
  ASSERT public.is_reserved_username('depikt'), 'depikt itself is reserved';
  ASSERT NOT public.is_reserved_username('quiet-orbit-4821'), 'a normal generated username is not reserved';
END $$;

-- 6. RLS: identity columns are locked; editable columns are not.
DO $$
DECLARE u uuid := gen_random_uuid(); rejected boolean := false;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'lock@test.local');
  UPDATE public.profiles SET display_name = 'New Name', avatar_variant = 's1-b1-c1' WHERE user_id = u;
  BEGIN
    UPDATE public.profiles SET user_id = gen_random_uuid() WHERE user_id = u;
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  ASSERT rejected, 'user_id must be immutable';
END $$;

-- 7. Coexistence with the starter-credit trigger: both fire independently
--    for the same signup, neither blocks the other.
DO $$
DECLARE u uuid := gen_random_uuid(); has_profile boolean; has_credits boolean;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'coexist@test.local');
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = u) INTO has_profile;
  SELECT EXISTS(SELECT 1 FROM public.credit_accounts WHERE user_id = u AND extra_credits = 5) INTO has_credits;
  ASSERT has_profile, 'profile trigger must run';
  ASSERT has_credits, 'starter-credit trigger must also run for the same signup';
END $$;
