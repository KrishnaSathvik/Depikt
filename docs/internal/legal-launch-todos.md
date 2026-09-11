# Legal launch checklist (internal — never linked from the product)

Facts the operator (or legal counsel) needs to decide before commercial
launch. `src/data/legal.ts` (Privacy/Terms) omits the clauses that depend
on these rather than publish an invented answer — none of them render
publicly today. `tests/unit/commercial-ux.test.ts` fails if a
`[OWNER INPUT` marker (or an invented governing-law clause) ever
reappears in `PRIVACY_MD`/`TERMS_MD`.

| Item | Needed for | Status |
|---|---|---|
| Operator/legal entity name, country, address | A "Who operates Depikt" clause | Not decided |
| A working privacy contact (email or form) | Privacy Policy's "Your choices" section; most privacy laws require one | Not decided — Depikt has no support inbox today |
| Minimum account age | Privacy/Terms currently state 13+, parental permission under 18 (matches provider baseline terms) | Decided, in effect |
| Governing law, venue, arbitration | Terms §16 (currently omitted) | Not decided |
| Refund policy specifics (window, conditions) for subscriptions/packs | Terms §8 (currently states only "per applicable law and terms shown at purchase") | Not decided |
| Supabase hosting region | Privacy's service-provider list (currently unstated) | Not verified |
| OpenAI API data-retention terms, reconfirmed at publication | Privacy's AI-processing section | Stated from OpenAI's public API data-controls policy; reconfirm before launch |
| Credit/account forfeiture wording on termination for breach | Terms §4 (currently just states no cash value / non-transferable) | Not decided |

When an item above is decided, add the real clause back to
`PRIVACY_MD`/`TERMS_MD` in `src/data/legal.ts` and update this row to
"Resolved (date)".
