# Prompt-engine benchmark harness

Runs the Depikt prompt engine end to end (system prompt → server-side request
construction → model → sanitizer → strict schema validation → deterministic
checks) against a named model/API configuration and records quality, latency,
tokens and estimated cost.

Requires `OPENAI_API_KEY` in `.env` (or the environment). Results are written to
`benchmark-results/` (git-ignored). Each run stores full metadata (prompt
version, system-prompt SHA-256, model, request params, cases, repeat) so it can
be reproduced.

```bash
npm run bench -- --config baseline            # true pre-migration baseline (Chat Completions)
npm run bench -- --config luna-none           # Responses API, gpt-5.6-luna, reasoning none
npm run bench -- --config terra-medium-subset # representative subset only
npm run bench -- --config baseline --repeat 3 --concurrency 3
npm run bench -- --config luna-none --filter critic   # one group / id substring
npm run bench -- --config baseline --dry      # prints constructed messages, no API calls
npm run bench:compare                          # side-by-side table of every config's latest run
```

Configurations live in `configs.ts`. Every configuration uses the SAME engine
behavior; only transport, model and sampling parameters differ. Example
injection is seeded per case so every configuration sees identical curated
examples.

## Cases

- `cases/builder.json` — Prompt Builder cases (`mode: default`)
- `cases/critic.json` — Prompt Critic cases (`mode: CRITIQUE`)

Fields: `id`, `group`, `input`, optional `tags` (`subset` marks the
representative subset), optional `edge: true` (encodes desired post-migration
behavior the v2.9 engine is expected to fail; reported separately), and
`expect` with any of:

`category`, `category_any`, `ratio`, `must_contain`, `must_contain_any`,
`must_not_contain`, `must_match`, `must_not_match` (regex), `page_count`,
`panel_count`, `score_range`, `feedback_match` (regex over critic weaknesses +
improvements), `rewritten_must_contain`, `rewritten_must_not_contain`.

Text checks run against `prompt` (builder) or `rewritten_prompt` (critic).

## Notes

- The `baseline` config replicates the exact pre-migration route call: Chat
  Completions, one loose `deliver_prompt` tool, forced `tool_choice`,
  temperature 0.7. Its output is still validated against the new STRICT
  contract so "schema success" is measured against the same bar.
- Non-streaming calls are used for benchmarking so `usage` is reported by the
  API. Latency is total request time.
- Reasoning tokens are counted inside output tokens for cost estimation.
