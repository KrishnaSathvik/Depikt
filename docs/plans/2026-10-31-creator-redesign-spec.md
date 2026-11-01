# Creator Redesign — Audit, Design System, and Screen Designs

Date: 2026-10-31. Scope: the Home creator (`#create`) — Generate, Improve prompt, Critique — desktop and mobile. Backend behaviour, routes, persisted identifiers, pricing, and existing flows are unchanged.

Principle: **a premium creative studio, not a dashboard.** One obvious next action per state, advanced controls only when useful, output carries the visual weight.

## 1. Audit of the current creator (main @ b014cc3)

Evidence: local dev server, 1440×900 and 390×844 screenshots of all three modes (idle), source read of `CreateWorkspace`, `CreationComposer`, `GenerateWorkspace`, `BuildMode`, `CritiqueMode`, `ReferenceImagePicker`, `ReferencePackPicker`.

**Keep (working foundations)**

- One shared draft, references, generation hook, and auth gate (`CreatorDraftProvider`).
- One composer shell (`CreationComposer`) with references row and footer submit.
- Accessible tablist with roving `tabIndex` and arrow, Home, and End keys.
- Tool handoffs: Improve → Generate/Critique, Critique → Generate, with prompts preserved.
- Streaming Builder output, variations, why-it-works, the Critic rubric with rewrite, the generation canvas with versions, editing, and series.

**Problems**

| #   | Area              | Finding                                                                                                                                                                                                       |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Layout            | The creator spans 1400px. On desktop the prompt runs about 1300px wide at 18px, which is hard to read and makes the box feel empty.                                                                           |
| A2  | Mode switcher     | Three plain text tabs. Each mode's purpose is only in a `title` tooltip, which is invisible on touch and to most users.                                                                                       |
| A3  | Sameness          | All three idle screens are visually identical: the same box, chips, and button. Nothing signals "image studio" vs "writing" vs "analysis".                                                                    |
| A4  | Composer controls | "+ Reference image 0/4" is mono, dashed, and tertiary grey. "Saved references" is a solid outline button. The two adjacent controls use two visual languages. Mono is reserved for data in the design system. |
| A5  | Touch targets     | Reference and pack controls are about 32px tall, under the 44px mobile minimum.                                                                                                                               |
| A6  | Ratio and credit  | A bare native `<select>` ("Auto ▾") followed by "· 1 credit". The credit label says nothing about what is included.                                                                                           |
| A7  | Generate result   | Stacked layout. The prompt surface and metadata sit above the image, so the image is pushed below the fold. Status lines are plain paragraphs.                                                                |
| A8  | Improve result    | A long vertical stack: prompt, tags, actions, variations each with full action rows, why-it-works, New. "Replace my prompt" floats above the result. There is no before/after view.                           |
| A9  | Critique result   | Score, all rubric rows, weaknesses, improvements, and rewrite in one long column. The top fixes are not prioritised. "Use revised prompt" floats above the report.                                            |
| A10 | Result separator  | A heavy black rule (`border-[color:var(--text-primary)]`) separates input from output in Improve and Critique. Black is reserved for ink and actions.                                                         |
| A11 | Loading           | `PromptLoadingState` and `ThinkingField` exist but differ across modes. The Generate canvas has its own states.                                                                                               |

## 2. Design system additions

All values are tokens in `src/styles.css` (white canvas, black ink, hairlines). No new colours.

| Token / rule    | Value                                                                           | Use                                     |
| --------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| `--creator-max` | 1040px                                                                          | Creator stage width (input and results) |
| `--tap-min`     | 44px                                                                            | Minimum touch target on coarse pointers |
| Surface         | `--bg-elevated` + `--border-default`, radius `--radius-lg`                      | Composer, result panels                 |
| Quiet surface   | `--bg-subtle`                                                                   | Segmented control track, selected chips |
| Focus           | 2px `--accent` ring on `:focus-visible`; composer shows a `focus-within` border | All interactive elements                |
| Motion          | 150ms ease-out colour and opacity only; none under reduced motion               | Global                                  |

**Shared components**

- **ModeSwitcher** (in `CreateWorkspace`): a segmented control on a quiet track. Each tab has an icon and a label; the active tab is a white raised pill with ink text. The active mode's one-line purpose is shown below and linked with `aria-describedby`. The tablist semantics and keyboard support are kept.
- **CreationComposer**: one surface with a focus-within border; textarea, then tool row, then footer (context left, one primary action right). Exports `COMPOSER_TOOL_CLASS` for every tool control: references, packs, intent, ratio. These are sans, 13px, secondary ink, hairline border, and 44px tall on mobile, 36px on desktop.
- **Action hierarchy** (M2–M4): one primary (solid ink), up to two secondary (outline), the rest in a quiet text row or an overflow.
- **ResultPanel** (M2–M4): hairline surface with a header (label and status) and an actions footer. It replaces the heavy black rule.
- **StatusLine** (M2): honest step list from job state (Preparing → Generating → Checking → Refining), shown with icons. Uses `role="status"`.

## 3. Screen designs

### Generate

```
Desktop, idle                          Desktop, result (≥1024px)
┌───────── 1040 ─────────┐            ┌──────────────── 1040 ────────────────┐
│ [✦ Generate|Improve|Critique]        │ ┌──────── image (≈62%) ───┐ ┌panel─┐ │
│ Create an image from a prompt…       │ │                          │ │Prompt│ │
│ ┌───────────────────────┐           │ │        result            │ │(coll)│ │
│ │ Describe your image…  │           │ │                          │ │Status│ │
│ │                       │           │ └──────────────────────────┘ │Edit  │ │
│ ├ [⊕ Reference] [Saved] ┤           │ [v1][v2][v3]                 │Use as│ │
│ │ [▢ ▭ ▯ Auto]  1 credit · check incl.  [Generate]               │ref   │ │
│ └───────────────────────┘           │                              │Regen │ │
│ Try: [Travel poster] [Portrait] …    └──────────────────────────────────────┘
Mobile: image full width → sticky action toolbar → collapsible prompt and status.
```

- The ratio becomes a visual choice group (Auto, 1:1, 3:2, 2:3, 16:9, 9:16), keeping the same `aria-label="Aspect ratio"` semantics.
- Credit caption: "1 credit · check and eligible repair included" (copy validated in M2; no price change).
- Result actions: primary **Regenerate · 1 credit**; secondary **Edit**, **Use as reference**, **Improve prompt**; quiet **Download**, **New**.

### Improve prompt

```
Desktop, result
┌──────────── 1040 ────────────┐
│ Original idea (quiet, 1–3 lines, Edit)                        │
│ ┌ Improved prompt ─────────── [Text|JSON] [Copy] ┐            │
│ │ mono body, streamed                             │            │
│ └ [Generate image · 1 credit]  [Critique]  [Compare]          │
│ Versions: (Safe) (Stylized) (Experimental)   ← one visible     │
│ Refine: [Warmer light] [Closer crop] …  (M3, prompt-derived)   │
│ ▸ Why this works                                               │
Mobile: Before/After toggle; same order, single column.
```

- Compare shows a word-level diff (added and removed) between the original idea and the selected version.
- "Lock details" (M3) needs a writer-input contract change. It is designed here and implemented only with validation.

### Critique

```
Desktop, result
┌──────────── 1040 ────────────┐
│ ┌ 6.4/10  Good foundation… ──────────────┐                    │
│ │ Top fixes: 1 Lighting vague  2 …  3 …   │                    │
│ └─────────────────────────────────────────┘                    │
│ ┌ Revised prompt ── [Copy] ┐  (desktop: side-by-side with original + diff)
│ └ [Generate revised · 1 credit] [Use in Improve]               │
│ ▸ Detailed analysis (10-dimension rubric)                      │
Mobile: score card → top fixes → revised prompt → details.
```

- Span highlights and per-fix Apply are **gated** on the structured finding contract and the Critique benchmark (see the V1 plan, M4). Until then, fixes render as text only.

## 4. Milestones and acceptance

Every milestone ships with all of the following:

- desktop (1440) and mobile (390) screenshots of idle, loading, result, and error states
- keyboard-only pass
- axe-style checks: labels, roles, focus order
- 44px targets on mobile
- `npm test`, `npm run typecheck`, and ESLint on changed files
- confirmation that existing flows still work: draft persists across tabs, handoffs, auth gate, Library "Use this prompt" without auto-submit

| Milestone | Scope                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1**    | Creator stage width, ModeSwitcher, composer surface and tool-control system, touch targets                                                   |
| **M2**    | Generate: ratio choice group, credit caption, image-first result layout, StatusLine, result actions                                          |
| **M3**    | Improve: ResultPanel, versions selector, compare/diff, Replace placement, refinement bar (prompt-derived; contract change only if validated) |
| **M4**    | Critique: score card with top fixes, revised-prompt panel with diff, collapsible rubric, gated span highlights                               |
