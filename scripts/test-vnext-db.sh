#!/bin/sh
# Disposable PostgreSQL cluster over a local Unix socket; no external database.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cluster=$(mktemp -d /tmp/depikt-vnext-db.XXXXXX)
cleanup() {
  pg_ctl -D "$cluster/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$cluster"
}
trap cleanup EXIT INT TERM
initdb -D "$cluster/data" -A trust --no-locale >/dev/null
pg_ctl -D "$cluster/data" -l "$cluster/postgres.log" -o "-k $cluster -h '' -p 55439" -w start >/dev/null
psql -h "$cluster" -p 55439 -d postgres -v ON_ERROR_STOP=1 -f "$repo/tests/db/vnext-grounding-validation.sql"
