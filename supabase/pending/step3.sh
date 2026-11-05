#!/bin/bash
# Step 3 isolated-database tests; never touches the live database.
# Verifies the execution-token lockdown in step3_job_execution_tokens.sql.
set -u
cd /tmp/credit-fix
export PGHOST=/tmp/credit-fix/sock PGPORT=55432 PGUSER=postgres PGDATABASE=postgres
unset PGPASSWORD
pg_ctl -D data stop -m immediate >/dev/null 2>&1
rm -rf data sock; mkdir -p sock
initdb -D data -U postgres -A trust >/dev/null
pg_ctl -D data -o "-k /tmp/credit-fix/sock -p 55432 -c listen_addresses=''" -l pg.log start >/dev/null; sleep 2
P="psql -X -q -v ON_ERROR_STOP=1"
$P -f setup2.sql >/dev/null 2>setup.err || { echo SETUP FAILED; cat setup.err; exit 1; }

A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222
S=33333333-3333-3333-3333-333333333333
J1=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1
J2=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2
J3=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3
J4=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4
J5=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5

# Harness-only additions (repair-claim table, grants, identity trigger).
$P -f /dev-server/supabase/pending/step3_harness_setup.sql >/dev/null

$P >/dev/null <<SQL
insert into credit_accounts(user_id,available_credits,plan_credits,extra_credits)
  values ('$A',6,4,2),('$B',10,0,10);
insert into generation_sessions(id,user_id,plan_json) values
  ('$S','$A','{"mode":"single"}'::jsonb);
insert into generation_jobs(id,user_id,session_id,operation,model,prompt,idempotency_key,status) values
  ('$J1','$A','$S','generate','sunburst','p','k1','queued'),
  ('$J2','$A','$S','generate','sunburst','p','k2','queued'),
  ('$J3','$A','$S','generate','sunburst','p','k3','queued'),
  ('$J4','$A','$S','generate','sunburst','p','k4','queued'),
  ('$J5','$A','$S','generate','sunburst','p','k5','queued');
SQL

PASS=0; FAIL=0
expect() {
  local want=$1 role=$2 uid=$3 label=$4 sql=$5 claim=""
  [ "$uid" != "-" ] && claim="set local request.jwt.claim.sub='$uid';"
  if $P -c "begin; set local role $role; $claim $sql; commit;" >/tmp/credit-fix/out 2>&1; then got=allow; else got=deny; fi
  if [ "$got" = "$want" ]; then PASS=$((PASS+1)); echo "ok   [$want] $label"; else FAIL=$((FAIL+1)); echo "FAIL [want $want got $got] $label"; sed 's/^/     /' /tmp/credit-fix/out | head -3; fi
}
checkauth() { # checkauth <uid> <label> <expected> <sql>
  local uid=$1 label=$2 want=$3 sql=$4 got
  got=$($P -At -c "begin; set local role authenticated; set local request.jwt.claim.sub='$uid'; $sql; commit;" 2>&1)
  if [ "$got" = "$want" ]; then PASS=$((PASS+1)); echo "ok   $label"; else FAIL=$((FAIL+1)); echo "FAIL $label [want $want got $got]"; fi
}
check() { # check <label> <expected> <sql>  (runs as superuser)
  local label=$1 want=$2 sql=$3 got
  got=$($P -At -c "$sql" 2>&1)
  if [ "$got" = "$want" ]; then PASS=$((PASS+1)); echo "ok   $label"; else FAIL=$((FAIL+1)); echo "FAIL $label [want $want got $got]"; fi
}

# Apply Step 1, Step 2, then Step 3 migrations.
$P -f /dev-server/supabase/pending/lock_down_credit_functions.sql >/dev/null 2>mig1.err || { echo STEP1 MIGRATION FAILED; cat mig1.err; exit 1; }
$P -f /dev-server/supabase/pending/step2_job_security.sql >/dev/null 2>mig2.err || { echo STEP2 MIGRATION FAILED; cat mig2.err; exit 1; }
$P -f /dev-server/supabase/pending/step3_job_execution_tokens.sql >/dev/null 2>mig3.err || { echo STEP3 MIGRATION FAILED; cat mig3.err; exit 1; }

echo "== 1. Token column =="
check "every job got a distinct token" "5" "select count(distinct execution_token) from generation_jobs"
expect deny authenticated $A "owner cannot SELECT the token column" "select execution_token from generation_jobs where id='$J1'"
expect deny authenticated $A "select * no longer works for owner" "select * from generation_jobs where id='$J1'"
expect allow authenticated $A "owner can still SELECT explicit columns" "select id, status from generation_jobs where id='$J1'"

echo "== 2. Transitions require the token =="
T1=$($P -At -c "select execution_token from generation_jobs where id='$J1'")
expect deny authenticated $A "queued->running without token" "select transition_generation_job('$J1','running')"
expect deny authenticated $A "queued->running with wrong token" "select transition_generation_job('$J1','running','{}','wrong-token')"
expect allow authenticated $A "queued->running with token" "select transition_generation_job('$J1','running','{}','$T1')"
expect deny authenticated $A "running->succeeded without token" "select transition_generation_job('$J1','succeeded','{\"usage_json\":{}}')"
expect allow authenticated $A "running->succeeded with token" "select transition_generation_job('$J1','succeeded','{\"usage_json\":{}}','$T1')"
checkauth $A "terminal still final with token" "f" "select transition_generation_job('$J1','failed','{\"error_code\":\"unknown\"}','$T1')"

echo "== 3. The Step 2 abuse is closed =="
T2=$($P -At -c "select execution_token from generation_jobs where id='$J2'")
expect allow authenticated $A "J2 claimed with token" "select claim_generation_job('$J2','$T2')"
expect deny authenticated $A "user cannot force-fail own running job (no token)" "select transition_generation_job('$J2','failed','{\"error_code\":\"unknown\"}')"
expect deny authenticated $A "user cannot force-fail own running job (guessed token)" "select transition_generation_job('$J2','failed','{\"error_code\":\"unknown\"}','00000000')"
checkauth $A "job still running after attempts" "running" "select status from generation_jobs where id='$J2'"
expect allow authenticated $A "user CAN cancel own running job (no token needed)" "select transition_generation_job('$J2','cancelled')"
checkauth $A "cancelled stuck" "cancelled" "select status from generation_jobs where id='$J2'"

echo "== 4. claim_generation_job =="
T3=$($P -At -c "select execution_token from generation_jobs where id='$J3'")
expect deny authenticated $A "claim without token" "select claim_generation_job('$J3', null)"
expect deny authenticated $A "claim with wrong token" "select claim_generation_job('$J3','nope')"
checkauth $A "claim with token" "claimed" "select claim_generation_job('$J3','$T3')"
checkauth $A "second claim reports already_running" "already_running" "select claim_generation_job('$J3','$T3')"
checkauth $B "non-owner claim is not_found" "not_found" "select claim_generation_job('$J3','$T3')"
checkauth $A "terminal job claim" "terminal" "select claim_generation_job('$J1','$T1')"
expect deny anon - "anon cannot claim" "select claim_generation_job('$J3','$T3')"

echo "== 5. Validation save requires the token =="
expect deny authenticated $A "validation save without token" "select save_generation_job_validation('$J3','{\"snapshot\":1}','{\"verdict\":\"pass\"}')"
expect allow authenticated $A "validation save with token" "select save_generation_job_validation('$J3','{\"snapshot\":1}','{\"verdict\":\"pass\"}','$T3')"
check "validation_result written" '{"snapshot": 1}' "select validation_result::text from generation_jobs where id='$J3'"

echo "== 6. create_generation_job returns the token =="
checkauth $A "create returns job + token" "t|t" "select reserved, execution_token is not null from create_generation_job('$A','$S','generate','flare','p',1,1,null,'kc')"
check "created job token matches return" "t" "with r as (select execution_token from generation_jobs where idempotency_key='kc') select (select execution_token from r) = (select execution_token from generation_jobs where idempotency_key='kc')"
expect deny authenticated $B "B cannot create a job as A" "select * from create_generation_job('$A','$S','generate','flare','p',1,1,null,'kd')"

echo "== 7. Repair RPCs =="
T4=$($P -At -c "select execution_token from generation_jobs where id='$J4'")
$P -c "update generation_jobs set status='succeeded', completed_at=now() where id='$J4'" >/dev/null
expect deny authenticated $A "repair result write without claim" "select write_generation_repair_result('$J4', 0.5, '{}')"
expect deny authenticated $A "clear pending without repair row" "select clear_generation_repair_pending('$S')"
$P -c "insert into generation_request_repairs(session_id,user_id,job_id,state) values ('$S','$A','$J4','running')" >/dev/null
expect allow authenticated $A "repair result write with active claim" "select write_generation_repair_result('$J4', 0.5, '{\"validation\":{\"refinementPending\":false}}')"
check "repair telemetry written" "t" "select estimated_api_cost_usd = 0.5 from generation_jobs where id='$J4'"
expect allow authenticated $A "clear pending with repair row" "select clear_generation_repair_pending('$S')"
$P -c "update generation_request_repairs set state='complete' where job_id='$J4'" >/dev/null
expect deny authenticated $A "repair write after claim completed" "select write_generation_repair_result('$J4', 9.9, '{}')"

echo "== 8. image_versions repair gate =="
expect deny authenticated $A "no image on succeeded job without claim" "insert into image_versions(user_id,session_id,job_id,storage_path,mime_type,width,height,prompt,model) values ('$A','$S','$J4','x/y.png','image/png',1,1,'p','flare')"
$P -c "update generation_request_repairs set state='running' where job_id='$J4'" >/dev/null
expect allow authenticated $A "image allowed during active repair" "insert into image_versions(user_id,session_id,job_id,storage_path,mime_type,width,height,prompt,model) values ('$A','$S','$J4','x/y.png','image/png',1,1,'p','flare')"
$P -c "update generation_request_repairs set state='complete' where job_id='$J4'" >/dev/null
expect deny authenticated $A "no image after repair completed" "insert into image_versions(user_id,session_id,job_id,storage_path,mime_type,width,height,prompt,model) values ('$A','$S','$J4','x/z.png','image/png',1,1,'p','flare')"
expect deny authenticated $A "no image on failed job (fake-failure exploit stays closed)" "insert into image_versions(user_id,session_id,job_id,storage_path,mime_type,width,height,prompt,model) values ('$A','$S','$J2','x/w.png','image/png',1,1,'p','flare')"

echo "== 9. plan_json immutability with executionTokensEnc carve-out =="
expect allow authenticated $A "may add executionTokensEnc only" "update generation_sessions set plan_json = plan_json || '{\"executionTokensEnc\":{\"k1\":\"enc\"}}'::jsonb where id='$S'"
expect deny authenticated $A "may not change other plan_json content" "update generation_sessions set plan_json = '{\"mode\":\"series\",\"executionTokensEnc\":{\"k1\":\"enc\"}}'::jsonb where id='$S'"
expect deny authenticated $A "may not change user_id" "update generation_sessions set user_id='$B' where id='$S'"

echo
if [ "${STEP4_TESTS:-0}" = 1 ]; then
  $P -f /dev-server/supabase/pending/step4_media_metadata.sql >/dev/null
  echo "== 10. Native media and token-map regression =="
  expect deny anon - "anon cannot merge tokens" "select merge_generation_execution_tokens('$S','{}')"
  expect deny authenticated $B "non-owner cannot merge tokens" "select merge_generation_execution_tokens('$S','{}')"
  expect allow authenticated $A "owner merges tokens without changing signed plan" "select merge_generation_execution_tokens('$S','{\"k2\":\"enc2\"}')"
  check "old token entry preserved" "enc" "select plan_json->'executionTokensEnc'->>'k1' from generation_sessions where id='$S'"
  check "new token entry saved" "enc2" "select plan_json->'executionTokensEnc'->>'k2' from generation_sessions where id='$S'"
  $P -c "select reserve_generation_credits('$A',1,'k1','svg'); select reserve_generation_credits('$A',1,'k2','cancelled')" >/dev/null
  checkauth $A "SVG job settles once" "t" "select applied from settle_generation_job('$J1','charged')"
  checkauth $A "SVG job settlement replay is no-op" "f" "select applied from settle_generation_job('$J1','charged')"
  expect deny authenticated $A "succeeded native job cannot refund" "select settle_generation_job('$J1','refunded')"
  expect allow authenticated $A "cancelled job refunds" "select settle_generation_job('$J2','refunded')"
  expect deny authenticated $B "non-owner cannot settle" "select settle_generation_job('$J2','refunded')"
fi

if [ "${STEP4D_TESTS:-0}" = 1 ]; then
  $P -f /dev-server/supabase/pending/step4d_execution_boundary.sql >/dev/null 2>mig4d.err || { echo STEP4D MIGRATION FAILED; cat mig4d.err; exit 1; }
  echo "== 11. Step 4D: tokens never reach client roles =="
  K1=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1; K2=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2; K3=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3
  $P -c "update credit_accounts set available_credits=available_credits+10, extra_credits=extra_credits+10 where user_id='$A'" >/dev/null
  expect deny authenticated $A "create result has no execution_token column" "select execution_token from create_generation_job('$A','$S','generate','flare','p',1,1,null,'d1')"
  checkauth $A "create still reserves and returns job" "t|t" "select reserved, job_id is not null from create_generation_job('$A','$S','generate','flare','p',1,1,null,'d1')"
  checkauth $A "idempotent replay returns same job, no token" "t" "select job_id = (select id from generation_jobs where idempotency_key='d1') from create_generation_job('$A','$S','generate','flare','p',1,1,null,'d1')"
  check "replay did not reserve twice" "1" "select count(*) from credit_ledger where idempotency_key='d1'"
  check "create_generation_job output columns" "{job_id,reserved,available_credits}" "select proargnames[10:12]::text from pg_proc where proname='create_generation_job'"
  check "create_generation_jobs output columns" "{job_ids,reserved,available_credits}" "select proargnames[11:13]::text from pg_proc where proname='create_generation_jobs'"
  expect deny authenticated $A "series result has no execution_tokens column" "select execution_tokens from create_generation_jobs('$A','$S','generate','flare',array['a','b'],array['1','2'],1,1,null,'ds')"
  checkauth $A "series create + replay" "t" "select reserved from create_generation_jobs('$A','$S','generate','flare',array['a','b'],array['1','2'],1,1,null,'ds')"
  checkauth $A "series replay" "t" "select reserved from create_generation_jobs('$A','$S','generate','flare',array['a','b'],array['1','2'],1,1,null,'ds')"
  expect deny authenticated $A "owner cannot read execution_token column" "select execution_token from generation_jobs where idempotency_key='d1'"
  expect deny anon - "anon cannot read execution_token column" "select execution_token from generation_jobs"
  expect deny authenticated $A "owner cannot call token reader" "select get_generation_execution_token((select id from generation_jobs where idempotency_key='d1'),'$A')"
  expect deny anon - "anon cannot call token reader" "select get_generation_execution_token('$J3','$A')"
  expect allow service_role - "server (service_role) can read token" "select get_generation_execution_token('$J3','$A')"
  check "token reader refuses wrong owner" "" "set role service_role; select get_generation_execution_token('$J3','$B')"
  expect deny authenticated $A "merge token RPC removed" "select merge_generation_execution_tokens('$S','{}')"
  check "encrypted token map stripped from sessions" "0" "select count(*) from generation_sessions where plan_json ? 'executionTokensEnc'"
  expect deny authenticated $A "plan_json fully immutable (no token carve-out)" "update generation_sessions set plan_json = plan_json || '{\"executionTokensEnc\":{}}'::jsonb where id='$S'"
  check "no client-executable function returns the token column" "claim_generation_job,save_generation_job_validation,transition_generation_job" "select string_agg(distinct proname, ',' order by proname) from pg_proc where pronamespace='public'::regnamespace and prosrc ilike '%execution_token%' and has_function_privilege('authenticated', oid, 'execute')"
  check "every public SECURITY DEFINER function pins search_path" "0" "select count(*) from pg_proc where pronamespace='public'::regnamespace and prosecdef and not exists (select 1 from unnest(coalesce(proconfig,'{}')) c where c like 'search_path=%')"
  check "anon executes no SECURITY DEFINER credit/job function" "" "select string_agg(proname, ',') from pg_proc where pronamespace='public'::regnamespace and prosecdef and has_function_privilege('anon', oid, 'execute') and (proname like '%credit%' or proname like '%generation%' or proname like '%top_up%')"

  echo "== 12. Step 4D: lifecycle with server-fetched token =="
  D1=$($P -At -c "select id from generation_jobs where idempotency_key='d1'")
  TD=$($P -At -c "begin; set local role service_role; select get_generation_execution_token('$D1','$A'); commit;")
  expect deny authenticated $A "user cannot force-fail without token" "select transition_generation_job('$D1','failed','{\"error_code\":\"unknown\"}')"
  expect deny authenticated $A "guessed token rejected" "select claim_generation_job('$D1','deadbeef')"
  checkauth $B "cross-account claim not_found" "not_found" "select claim_generation_job('$D1','$TD')"
  # concurrent claims: exactly one wins
  ( $P -At -c "begin; set local role authenticated; set local request.jwt.claim.sub='$A'; select claim_generation_job('$D1','$TD'); commit;" > c1.out 2>&1 ) &
  ( $P -At -c "begin; set local role authenticated; set local request.jwt.claim.sub='$A'; select claim_generation_job('$D1','$TD'); commit;" > c2.out 2>&1 ) &
  wait
  check "concurrent claims: one claimed, one already_running" "already_running,claimed" "select '$(sort c1.out c2.out | paste -sd,)'"
  checkauth $A "server marks success with token" "t" "select transition_generation_job('$D1','succeeded','{}','$TD')"
  checkauth $A "success charges once" "t" "select applied from settle_generation_job('$D1','charged')"
  checkauth $A "charge replay no-op" "f" "select applied from settle_generation_job('$D1','charged')"
  expect deny authenticated $A "succeeded job cannot be refunded" "select settle_generation_job('$D1','refunded')"
  checkauth $A "succeeded job cannot be failed (no-op)" "f" "select transition_generation_job('$D1','failed','{\"error_code\":\"unknown\"}','$TD')"
  D2=$($P -At -c "select id from generation_jobs where idempotency_key='ds:1'")
  T2=$($P -At -c "begin; set local role service_role; select get_generation_execution_token('$D2','$A'); commit;")
  checkauth $A "server claims series child" "claimed" "select claim_generation_job('$D2','$T2')"
  checkauth $A "server fails child with token" "t" "select transition_generation_job('$D2','failed','{\"error_code\":\"provider_error\"}','$T2')"
  checkauth $A "failed job refunds once" "t" "select applied from settle_generation_job('$D2','refunded')"
  checkauth $A "refund replay no-op" "f" "select applied from settle_generation_job('$D2','refunded')"
  expect deny authenticated $A "failed job cannot then be charged" "select settle_generation_job('$D2','charged')"
  D3=$($P -At -c "select id from generation_jobs where idempotency_key='ds:2'")
  T3b=$($P -At -c "begin; set local role service_role; select get_generation_execution_token('$D3','$A'); commit;")
  checkauth $A "claim then user cancels mid-run (token-free)" "t" "select claim_generation_job('$D3','$T3b') = 'claimed' and transition_generation_job('$D3','cancelled')"
  checkauth $A "executor cannot succeed a cancelled job" "f" "select transition_generation_job('$D3','succeeded','{}','$T3b')"
  checkauth $A "cancelled job refunds" "t" "select applied from settle_generation_job('$D3','refunded')"
fi
echo "PASS=$PASS FAIL=$FAIL"
pg_ctl -D data stop -m immediate >/dev/null 2>&1
[ "$FAIL" = 0 ]
