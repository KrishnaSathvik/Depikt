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
npm run bench -- --config v3-production       # current production: GPT-6 Luna + GPT-6.1 Sol
npm run bench -- --config baseline            # true pre-migration baseline (Chat Completions)
npm run bench -- --config luna-none-temp      # historical: gpt-5.6-luna, reasoning none
npm run bench -- --config v3-luna             # historical Phase 2 mix (5.6 Luna + 5.6 Terra)
npm run bench -- --config baseline --repeat 3 --concurrency 3
npm run bench -- --config v3-production --filter critic   # one group / id substring
npm run bench -- --config baseline --dry      # prints constructed messages, no API calls
npm run bench:compare                          # side-by-side table of every config's latest run
```

Configurations live in `configs.ts`. Production text routing is `MODEL_ROLES`
in `src/lib/openai/models.ts` (GPT-6 Luna intent/writer, GPT-6.1 Sol critic).
Historical `gpt-5.6-*` configs stay for reproducibility; they are not current
production. Image generation (Flare / Sunburst) is out of scope for this harness.

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
