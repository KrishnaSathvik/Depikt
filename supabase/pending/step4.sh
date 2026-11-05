#!/usr/bin/env bash
# Disposable socket-only Postgres. Run as a non-root user; no production access.
set -euo pipefail
mkdir -p /tmp/credit-fix
cp /dev-server/supabase/pending/step4_harness_setup.sql /tmp/credit-fix/setup2.sql
export STEP4_TESTS=1
bash /dev-server/supabase/pending/step3.sh