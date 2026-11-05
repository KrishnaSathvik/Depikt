# Depikt — Engineering Decisions

- External research (grounding) is best-effort: a failed lookup degrades the plan to prompt-only generation instead of aborting the request. A helper feature must never cancel the work the user asked for.
- Signed-in code settles generation credits only through `settle_generation_job(job_id, outcome)`; raw credit functions (finalize, reserve, adjust, top-up, grants, resets) are service_role-only. Why: callers must never choose the account, amount or key, and each reservation gets exactly one outcome.
