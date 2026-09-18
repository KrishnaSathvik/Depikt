#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TASK_CONTAINER="depikt-reference-test-$$"
TASK_PORT=54339
docker run -d --rm --name "$TASK_CONTAINER" -e POSTGRES_PASSWORD=pg -p "127.0.0.1:$TASK_PORT:5432" postgres:16 >/dev/null
trap 'docker stop "$TASK_CONTAINER" >/dev/null' EXIT
export PGPASSWORD=pg
PSQL=(psql -v ON_ERROR_STOP=1 -q -h 127.0.0.1 -p "$TASK_PORT" -U postgres -d postgres)
ok=0
for _ in $(seq 1 90); do if "${PSQL[@]}" -c 'select 1' >/dev/null 2>&1; then ok=$((ok+1)); [ "$ok" -ge 2 ] && break; fi; sleep 0.5; done
"${PSQL[@]}" -f tests/sql/bootstrap-auth-stub.sql
"${PSQL[@]}" <<'SQL'
create schema storage;
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
create policy test_read on storage.objects for select to authenticated using(true);
SQL
"${PSQL[@]}" -f supabase/migrations/20260916120000_add_reference_entities.sql
"${PSQL[@]}" -f supabase/migrations/20260916120000_add_reference_entities.sql
"${PSQL[@]}" -f tests/sql/reference-entities.test.sql
