#!/usr/bin/env bash
# Step 4D isolated-database tests (real roles: anon, authenticated, service_role).
set -euo pipefail
mkdir -p /tmp/credit-fix
cp /dev-server/supabase/pending/step4_harness_setup.sql /tmp/credit-fix/setup2.sql
export STEP4_TESTS=1 STEP4D_TESTS=1
bash /dev-server/supabase/pending/step3.sh
