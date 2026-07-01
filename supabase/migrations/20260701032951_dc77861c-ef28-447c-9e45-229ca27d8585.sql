
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;

-- Writes now require service_role (used by admin scripts). No anon/authenticated write policies.
-- Files remain accessible via public URLs because the bucket is public; listing is disabled
-- by not granting SELECT on storage.objects to anon/authenticated.
