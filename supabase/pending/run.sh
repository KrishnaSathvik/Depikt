#!/bin/bash
# Isolated local Postgres; never touches the live database.
set -u
cd /tmp/credit-fix
export PGHOST=/tmp/credit-fix/sock PGPORT=55432 PGUSER=postgres PGDATABASE=postgres
unset PGPASSWORD
pg_ctl -D data stop -m immediate >/dev/null 2>&1
rm -rf data sock; mkdir -p sock
initdb -D data -U postgres -A trust >/dev/null
pg_ctl -D data -o "-k /tmp/credit-fix/sock -p 55432 -c listen_addresses=''" -l pg.log start >/dev/null; sleep 2
P="psql -X -q -v ON_ERROR_STOP=1"
$P -f setup.sql >/dev/null 2>setup.err || { echo SETUP FAILED; cat setup.err; exit 1; }

A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222
S=33333333-3333-3333-3333-333333333333
SB=44444444-4444-4444-4444-444444444444
$P -c "insert into credit_accounts(user_id,available_credits,extra_credits) values ('$A',1,1),('$B',10,10);
insert into generation_sessions(id,user_id) values ('$S','$A'),('$SB','$B');" >/dev/null

PASS=0; FAIL=0
# expect <allow|deny> <role> <uid|-> <label> <sql>
expect() {
  local want=$1 role=$2 uid=$3 label=$4 sql=$5 claim=""
  [ "$uid" != "-" ] && claim="set local request.jwt.claim.sub='$uid';"
  if $P -c "begin; set local role $role; $claim $sql; commit;" >/tmp/credit-fix/out 2>&1; then got=allow; else got=deny; fi
  if [ "$got" = "$want" ]; then PASS=$((PASS+1)); echo "ok   [$want] $label"; else FAIL=$((FAIL+1)); echo "FAIL [want $want got $got] $label"; sed 's/^/     /' /tmp/credit-fix/out | head -3; fi
}
bal() { $P -At -c "select available_credits||'/'||reserved_credits from credit_accounts where user_id='$1'"; }

echo "== BEFORE fix (live grants reproduced) =="
expect allow anon - "signed-out visitor adds 1000 credits to B via adjust_credits" "select * from adjust_credits('$B','extra',1000,'x','exploit1')"
expect allow authenticated $A "A fakes a 500-credit refund for itself via finalize" "select * from finalize_generation_credits('$A',500,'fake','refunded',null)"
expect allow anon - "signed-out visitor wipes B via reset_plan_credits" "select reset_plan_credits('$B','exploit2','x')"
$P -c "truncate credit_ledger; update credit_accounts set available_credits=case when user_id='$A' then 1 else 10 end, extra_credits=case when user_id='$A' then 1 else 10 end, reserved_credits=0" >/dev/null

$P -f migration.sql >/dev/null 2>mig.err || { echo MIGRATION FAILED; cat mig.err; exit 1; }
echo "== AFTER fix =="
for f in "adjust_credits('$B','extra',1000,'x','e1')" "apply_top_up('$B',1000,'cs_fake')" "finalize_generation_credits('$A',500,'fake','refunded',null)" "reserve_generation_credits('$B',5,'drain')" "grant_subscription_credits('$B',100,'p1')" "grant_starter_credits('$B')" "reset_plan_credits('$B','r','x')" "lock_credit_account('$B')"; do
  expect deny anon - "anon: ${f%%(*}" "select * from $f"
  expect deny authenticated $A "signed-in: ${f%%(*}" "select * from $f"
done
expect deny anon - "anon: create_generation_job" "select * from create_generation_job('$A','$S','generate','m','p',1,1,null,'k0')"
expect deny anon - "anon: settle_generation_job" "select * from settle_generation_job(gen_random_uuid(),'refunded')"
expect allow service_role - "server: adjust_credits still works" "select * from adjust_credits('$B','extra',0,'noop','svc0')"
expect allow service_role - "server: apply_top_up still works (pack)" "select * from apply_top_up('$B',25,'cs_test_1','pack_25')"
expect allow service_role - "server: grant_subscription_credits still works" "select * from grant_subscription_credits('$B',40,'sub_1:2026-11')"
echo "   B after server grants: $(bal $B) (want 75/0: 10 + 25 pack + 40 plan)"

# Generation lifecycle as user A (1 credit)
expect allow authenticated $A "A creates a job (reserves its 1 credit)" "select * from create_generation_job('$A','$S','generate','m','p',1,1,null,'job1')"
echo "   A after reserve: $(bal $A) (want 0/1)"
J1=$($P -At -c "select id from generation_jobs where idempotency_key='job1'")
expect deny authenticated $A "A cannot refund a job that is still running" "select * from settle_generation_job('$J1','refunded')"
expect deny authenticated $A "A cannot charge a job that hasn't succeeded" "select * from settle_generation_job('$J1','charged')"
expect deny authenticated $B "B cannot settle A's job" "update generation_jobs set status='succeeded' where id='$J1'; select * from settle_generation_job('$J1','refunded')"
$P -c "update generation_jobs set status='succeeded' where id='$J1'" >/dev/null
expect allow authenticated $A "success: A's job is charged" "select * from settle_generation_job('$J1','charged')"
expect allow authenticated $A "charge replay is a no-op" "select * from settle_generation_job('$J1','charged')"
expect deny authenticated $A "succeeded job cannot also be refunded" "select * from settle_generation_job('$J1','refunded')"
echo "   A after charge: $(bal $A) (want 0/0)"

$P -c "update credit_accounts set available_credits=1, extra_credits=1 where user_id='$A'" >/dev/null
expect allow authenticated $A "A creates job2" "select * from create_generation_job('$A','$S','generate','m','p',1,1,null,'job2')"
J2=$($P -At -c "select id from generation_jobs where idempotency_key='job2'")
$P -c "update generation_jobs set status='failed' where id='$J2'" >/dev/null
expect allow authenticated $A "failure: job2 refunded" "select * from settle_generation_job('$J2','refunded')"
expect allow authenticated $A "refund replay is a no-op" "select * from settle_generation_job('$J2','refunded')"
echo "   A after refund + replay: $(bal $A) (want 1/0 — refunded once)"
$P -c "update generation_jobs set status='cancelled' where id='$J2'" >/dev/null 2>&1
expect deny authenticated $A "refunded job cannot also be charged" "update generation_jobs set status='running' where id='$J2'; update generation_jobs set status='succeeded' where id='$J2'; select * from settle_generation_job('$J2','charged')"

# Series: B reserves 3, one child fails
expect allow authenticated $B "B creates a 3-image series" "select * from create_generation_jobs('$B','$SB','generate','m',array['a','b','c'],array['1','2','3'],1,1,null,'ser')"
$P -c "update generation_jobs set status='succeeded' where idempotency_key in ('ser:1','ser:2'); update generation_jobs set status='failed' where idempotency_key='ser:3'" >/dev/null
for k in 1 2; do id=$($P -At -c "select id from generation_jobs where idempotency_key='ser:$k'"); expect allow authenticated $B "series child $k charged" "select * from settle_generation_job('$id','charged')"; done
id=$($P -At -c "select id from generation_jobs where idempotency_key='ser:3'"); expect allow authenticated $B "series child 3 refunded" "select * from settle_generation_job('$id','refunded')"
echo "   B after series: $(bal $B) (want 73/0: 75 - 2 charged)"

# Race: account with 1 credit, two near-simultaneous jobs
C=55555555-5555-5555-5555-555555555555; SC=66666666-6666-6666-6666-666666666666
$P -c "insert into credit_accounts(user_id,available_credits,extra_credits) values ('$C',1,1); insert into generation_sessions(id,user_id) values ('$SC','$C')" >/dev/null
for i in 1 2; do ( $P -At -c "begin; set local role authenticated; set local request.jwt.claim.sub='$C'; select pg_sleep(0.2); select reserved from create_generation_job('$C','$SC','generate','m','p',1,1,null,'race$i'); commit;" > race$i.out 2>&1 ) & done; wait
echo "   race results: $(cat race1.out race2.out | tr '\n' ' ')"
won=$(cat race1.out race2.out | grep -c '^t$'); jobs=$($P -At -c "select count(*) from generation_jobs where user_id='$C'")
if [ "$won" = 1 ] && [ "$jobs" = 1 ] && [ "$(bal $C)" = "0/1" ]; then PASS=$((PASS+1)); echo "ok   [race] two requests on 1 credit: exactly one reserved"; else FAIL=$((FAIL+1)); echo "FAIL [race] won=$won jobs=$jobs bal=$(bal $C)"; fi

# Ledger must equal balances
echo "   effective grants after fix:"; $P -At -c "select '     '||proname||' '||proacl::text from pg_proc where pronamespace='public'::regnamespace and proname ~ 'credit|top_up|settle|generation_job|starter|plan_credits' order by 1"
echo "RESULT: $PASS passed, $FAIL failed"
pg_ctl -D data stop -m fast >/dev/null
