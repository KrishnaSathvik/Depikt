-- Scheduled reconciliation for abandoned generation jobs.
-- NOT APPLIED. Run with the database SQL tool only after
-- step2_job_security.sql is live.
--
-- Cadence: every 15 minutes. This is a backstop — the poll path already
-- fails and refunds stale jobs within ~6 minutes for anyone with the
-- session open. The cron exists for abandoned sessions only (the user
-- closed the tab and never came back), so a sub-hourly sweep is enough and
-- keeps the database from waking constantly for usually-empty work.
-- Worst case, an abandoned job's refund lands 15 minutes late.

SELECT cron.schedule(
  'reap-stale-generation-jobs',
  '*/15 * * * *',
  $$SELECT public.reap_stale_generation_jobs();$$
);
