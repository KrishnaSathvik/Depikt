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
# Two independent transactions race for different children of the same series.
for child in 88888888-8888-4888-8888-888888888888 99999999-9999-4999-8999-999999999999; do
  psql -h "$cluster" -p 55439 -d postgres -v ON_ERROR_STOP=1 -c "set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; select claim_generation_request_repair('cccccccc-cccc-4ccc-8ccc-cccccccccccc','$child');" > "$cluster/$child.log" &
done
wait
psql -h "$cluster" -p 55439 -d postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
 if (select count(*) from generation_request_repairs where session_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>1 then raise exception 'Concurrent session claim not unique'; end if;
 if (select sum(repair_attempts) from generation_jobs where session_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>1 then raise exception 'Concurrent claims spent more than one image'; end if;
end$$;
select 'Concurrent series repair cap passed' as result;
SQL
