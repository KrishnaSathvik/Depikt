# Step 5 — UI/UX audit and targeted refinement

**Development only.** No publish/deploy, production database mutation, paid provider call, payment operation or price change. Steps 1–4D and their pending migrations are preserved. GIF execution remains unavailable until pricing is verified.

## 5A: Existing journeys and evidence

Signed-in Chromium walkthroughs used the requesting user's real account and saved raster creations. The browser blocked mutating application/API requests. Initial screenshots precede changes; screenshots are in `docs/step5-evidence/`. Device sizes: desktop 1280×1800, tablet 820×1180, mobile 390×844 and narrow mobile 360×780.

| Journey | Evidence / friction | Severity | Outcome |
|---|---|---|---|
| Home → Create | Actual hydration exception: server advertises generation while browser drops Generate. Compiled preview left optional `import.meta.env?.VITE_GENERATION_ENABLED` unresolved. | High | Direct Vite replacement expression; hydrate runtime-sensitive presentation first. Actual Generate tab now present, no page errors in verified walkthrough. Execution gates unchanged. |
| Improve / Critique | Platform-dependent keyboard text differs on Mac during hydration; decorative gradients/glow contradict white-and-ink creator identity. | Medium | Removed redundant keyboard-hint copy, retained shortcuts; calm white creation surface and ink actions. Hero unchanged. |
| Composer / output | SVG correctly gated, but animation looked selectable as an executable action. Advanced controls visible ahead of use. Referenced non-PNG requests silently disable submit. | Medium | In-place Output settings disclosure, GIF labeled preview-only with no-charge explanation; references explain PNG requirement. No new state owner. |
| Library → creator | Prompt dialog can hand off a real reviewed recipe without submitting. | Working | Verified prompt reads back into creator; preserved. |
| Library / Gallery / Templates | Automated contrast evidence: three count labels per tab state, 2.27–2.43:1 rather than 4.5:1. | High | Semantic muted-foreground labels; all three states pass repeated axe scan. |
| Critique example | axe `definition-list` / `dlitem`: nested layout div invalidates eight term/value nodes. | High | Direct term/value children within grouped definitions; repeated scan passes. |
| Editing | Small mode/tool targets; keyboard markup has no perceivable location; PNG encoded synchronously after every drag update. Nested stage/details wrappers visually frame already framed tools. | Medium | ≥44px targeted edit controls; visible keyboard cursor and screen-reader position/completion; frame-scheduled preview and async completed-stroke PNG encoding; unframed result layout. |
| Multiple references | Repeated remove/retry names do not identify the attachment; 40px mobile remove target. | Medium | Indexed names and 44px remove targets. Existing upload/retry hooks preserved. |
| Version/export actions | Hidden version scrollbar; long regenerate label squeezed into half-width mobile button; small saved-version/export targets. | Medium | Visible scrollbar, full-width wrapping regenerate action, touch-sized saved controls. Original download formats and versions unchanged. |
| Account/credits | Real existing creations and exhausted starter-credit balance render; no payment action taken. | Working | Kept plan/credit information, subscriptions and account architecture unchanged. |
| History / empty states | Signed-in empty history renders clear state and one main landmark. | Working | Preserved. |
| SVG / GIF readiness | SVG inactive under current family; GIF intentionally gated, not a defect to “enable.” | Release constraint | Preserved capability/pricing checks. Paid production execution not verified. |

No critical blocker was demonstrated in the permitted UI walkthrough. This is not a claim that every possible authenticated/provider state has been tested.

## 5B: Design and interaction decisions

- Keep Home as creation and Library as three discovery tabs; preserve legacy redirects and account ownership.
- Keep one shared draft/provider and generation hook for Generate, Improve prompt and Critique.
- White creation canvas, ink primary action and selected state; hierarchy through typography and spacing, no added gradients or dashboard chrome. Existing launch hero remains intact.
- Output settings stay in place, collapsed until needed. No new Animate workflow: GIF settings remain a non-executable preview with an explicit reason.
- Editing modes sit together with the real image; preserve original image and separate mask/markup artifacts.
- Existing exact one-credit still-image labels remain; no invented GIF charge, subscription change or payment action.
- Existing Radix dialogs retain focus/escape behavior. New changes use the project's Button and semantic colors.

## 5C: Exact changed components

`CreateWorkspace`, `LaunchModule` (hydration only), `BuildMode`, `CritiqueMode`, `ImagoPasteHint`, `CreationComposer`, `CreatorLayout/RatioPicker`, `ModeShowcase`, `MediaControls`, `GenerateWorkspace`, `GenerationActions`, `GenerationEditForm`, `GenerationMaskEditor`, `GenerationMarkupEditor`, `GenerationResultLayout`, `AnimatedMediaPreview`, `CreationDetailView`, and Library count/structured-data presentation.

Supporting changes: `src/styles.css` creator overrides/heading spacing, frontend feature-flag expression, architectural rules in `AGENTS.md`, and milestone tracking. No backend refactor or migration edit.

## 5D/5E: Verification

- Actual signed-in Create: Generate → Improve → Critique, long prompt, ratio keyboard selection, SVG disabled, GIF controls/disabled submit, return to PNG: passed at 1280, 820, 390 and 360px, no document overflow.
- Real Library recipe → prompt dialog → Use this prompt → creator with actual recipe read back: passed, no submission.
- Real saved creation → Open in Generate → Whole image → Markup → keyboard rectangle → enabled Apply edit → Clear → disabled Apply edit: passed. Apply was never submitted. Desktop/mobile screenshots captured.
- Automated axe WCAG 2 A/AA and 2.1 AA scans after fixes: **zero violations** on Home/Generate, Improve, Critique, Library, Templates, Gallery, Account, History and Pricing. This does not replace manual screen-reader testing or assert coverage of every modal/state.
- Full application suite: **989 passed / 991 total**, two known pre-existing failures retained: missing offline `vnext3-brand-a-logo.png` fixture and exact-text series test's obsolete expected exception. Tests were not weakened.
- Relevant ESLint: clean on changed UI files and generation components.
- Harness compilation: build OK after changes. Manual build/typecheck was not run because the environment performs compilation automatically; do not label a separate full typecheck as executed.
- No runtime errors in final central walkthrough; no mutating application requests observed.

### Performance / accessibility limitations

Markup no longer base64-encodes full-resolution PNG on every pointer event; preview draws once per animation frame and PNG encoding is asynchronous on completion. No numerical throughput claim or real-phone memory/latency benchmark is made. Area mask still rasterizes full source dimensions and retains a keyboard Whole image alternative; incremental mask rasterization requires separately measured work. GIF native decoding/per-frame memory and SVG-to-PNG provider-result export were not re-benchmarked in this step; existing media unit regressions remain covered. Physical phone, screen-reader hardware and live OAuth/signup/email delivery were unavailable/not exercised. Reference uploads were not persisted because production mutations are prohibited; picker presentation was inspected. Paid loading/success/refund/provider recovery, native SVG results and live GIF generation remain unverified under the no-paid/no-production-write constraints.

## Remaining release blockers / stop point

1. Paid Images 2.6 markup/SVG provider validation, GIF cost/pricing benchmark: explicit future approval required.
2. Physical-device large-image/media performance validation and final coordinated release QA.
3. Pending Steps 1–4D database changes and coordinated app deployment only after final verification and explicit approval.
4. Two inherited unit failures remain visible; missing fixture must be restored and exact-text expected-exception discrepancy reviewed, not hidden.

Step 5 targeted refinement is complete; constrained live checks are documented above. Stop before Step 6 paid benchmarking and Step 7 coordinated deployment. Do not request publication.