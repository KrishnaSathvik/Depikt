#!/usr/bin/env bash
# Applies the credit/billing migrations to a throwaway Postgres in Docker and
# runs tests/sql/commercial-credits.test.sql against them. Never touches
# production. Usage: scripts/test-credit-migration.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PGTEST_PORT:-54329}"; NAME=depikt-migtest
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=pg -p "$PORT:5432" postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
export PGPASSWORD=pg
PSQL="psql -v ON_ERROR_STOP=1 -q -h 127.0.0.1 -p $PORT -U postgres -d postgres"
# initdb restarts the server once; wait until a real connection works twice.
ok=0; for _ in $(seq 1 90); do if $PSQL -c "select 1" >/dev/null 2>&1; then ok=$((ok+1)); [ $ok -ge 2 ] && break; fi; sleep 0.5; done
$PSQL -f tests/sql/bootstrap-auth-stub.sql
for f in supabase/migrations/20260910120000_*.sql supabase/migrations/20260910130000_*.sql supabase/migrations/20260911*.sql; do
  echo "applying $f"; $PSQL -f "$f"
done
$PSQL -f tests/sql/commercial-credits.test.sql
