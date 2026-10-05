# Depikt — Engineering Decisions

- External research (grounding) is best-effort: a failed lookup degrades the plan to prompt-only generation instead of aborting the request. A helper feature must never cancel the work the user asked for.
