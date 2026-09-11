#!/usr/bin/env bash
# Applies the generation, commercial-credit, and profile migrations to a
# throwaway Postgres in Docker and runs tests/sql/profiles.test.sql against
# them. Never touches production. Usage: scripts/test-profiles-migration.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PGTEST_PORT:-54330}"; NAME=depikt-profilestest
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=pg -p "$PORT:5432" postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
export PGPASSWORD=pg
PSQL="psql -v ON_ERROR_STOP=1 -q -h 127.0.0.1 -p $PORT -U postgres -d postgres"
ok=0; for _ in $(seq 1 90); do if $PSQL -c "select 1" >/dev/null 2>&1; then ok=$((ok+1)); [ $ok -ge 2 ] && break; fi; sleep 0.5; done
$PSQL -f tests/sql/bootstrap-auth-stub.sql
for f in supabase/migrations/20260910120000_*.sql supabase/migrations/20260910130000_*.sql supabase/migrations/20260911*.sql supabase/migrations/20260912100000_*.sql; do
  echo "applying $f"; $PSQL -f "$f"
done
$PSQL -f tests/sql/profiles.test.sql
echo "profiles migration: all invariants passed"
