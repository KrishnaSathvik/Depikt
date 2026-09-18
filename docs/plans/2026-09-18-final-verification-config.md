# VNext 4/5 verification configuration

Local development is the final-verification environment. This change enables its existing capabilities; it does not authorize executing images, research, live judging, the final matrix, or a browser pass. Production activation is still off. No deployment or push is included.

| Existing server setting     | Local development / QA (`npm run dev`) | Production |
| --------------------------- | -------------------------------------- | ---------- |
| `GROUNDING_ENABLED`         | `true`                                 | `false`    |
| `VALIDATION_REPAIR_ENABLED` | `true`                                 | `false`    |
| `AUTO_REPAIR_POLICY`        | `platform_absorbs_one_per_request`     | `disabled` |

The local values are in `.env.development`. `vite.config.ts` loads these three existing server flags into `process.env` for the dev server; the base config previously loaded only `VITE_*` values. No duplicate flags or client-facing feature switches were introduced. Production values are explicitly off in `.env.production` and the Worker runtime `vars` in `wrangler.jsonc`. Existing native generation settings are unchanged. No hosted QA or production environment was modified.

The launch policy is unchanged: one credit per requested output, included validation/grounding/automatic repair, one repair per session shared by all series children, original preservation on uncertainty or failed repair, and existing initial-provider-failure refund behavior. Grounding caps remain three web queries, two visual queries and eight sources; caching and provenance use the existing grounding path.

Configuration unit tests call the actual Vite config for development and production, check the Worker settings, and verify policy limits and the matrix hash without executing any scenario. Provider requests are not part of these checks.

Local grounding provider credentials are currently absent. Before separately authorized execution, configure the existing `BRAVE_SEARCH_API_KEY` or `GROUNDING_PROVIDER_URL` plus `GROUNDING_PROVIDER_TOKEN` in the verification environment. This change neither provisions a provider nor applies database migrations.

`tests/image-evals/final/matrix.json` remains byte-identical, with status `frozen-not-executed`: 14 scenarios, at most 18 initial images and at most one repair image across the entire matrix. The overall matrix allowance is separate from the per-session launch limit. SHA-256: `d49ffa6119afb0d63b5040ab4106fbc2a7d9b14508dd85ea8d97111883621aa2`.

Stop after configuration and non-billable checks. Execution still requires separate explicit user authorization.
