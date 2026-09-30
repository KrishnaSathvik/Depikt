import { CreatorDraftProvider, useCreatorDraft } from "@/components/CreatorDraft";
import { TOOL } from "@/lib/product";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { BuildMode } from "@/components/prompt/BuildMode";
import { CritiqueMode } from "@/components/prompt/CritiqueMode";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import { parsePromptMode, type PromptMode } from "@/lib/creator-search";
const ALL_MODES: ReadonlyArray<{ id: PromptMode; label: string; hint: string }> = [
  { id: "generate", label: TOOL.generate, hint: "Create an image from a prompt or reference" },
  { id: "build", label: TOOL.improvePrompt, hint: "Refine a prompt before generating" },
  { id: "critique", label: TOOL.critique, hint: "Score and rewrite a prompt you already have" },
];

export function CreateWorkspace() {
  return (
    <CreatorDraftProvider>
      <WorkspaceTools />
    </CreatorDraftProvider>
  );
}

function WorkspaceTools() {
  const { setPrompt } = useCreatorDraft();
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const generationEnabled = isNativeGenerationEnabled();
  const MODES = generationEnabled ? ALL_MODES : ALL_MODES.filter((m) => m.id !== "generate");
  const requestedMode = parsePromptMode(search.mode);
  // Generate is gated by the feature flag; a stale link/bookmark with
  // mode=generate while it's off falls back to Build rather than showing an
  // empty tab with no matching panel.
  const mode = requestedMode === "generate" && !generationEnabled ? "build" : requestedMode;

  /**
   * Drop consumed params (restore, prefill, seed, ref) but stay in this mode.
   * Keep the template slug only while still in Build — it is the shareable,
   * refresh-safe form of the active template context.
   */
  const clearSearch = (keep: PromptMode = mode) => {
    navigate({
      to: "/",
      hash: "create",
      search: {
        mode: keep,
        ...(keep === "build" ? { template: search.template } : {}),
      },
      replace: true,
      resetScroll: false,
    });
  };

  /** Remove the template context entirely (Build mode's "Remove"). */
  const clearTemplate = () => {
    navigate({ to: "/", hash: "create", search: { mode: "build" }, replace: true });
  };

  const switchMode = (next: PromptMode) => {
    if (next === mode) return;
    trackEvent("prompt_mode_switch", { mode: next });
    navigate({
      to: "/",
      hash: "create",
      search: {
        mode: next,
        // Templates only apply to Build; drop the slug when leaving that mode.
        ...(next === "build" ? { template: search.template } : {}),
      },
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <div>
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 sm:px-6 lg:px-12">
        <div
          role="tablist"
          aria-label="Creation tools"
          className="mb-4 flex gap-5 border-b border-[color:var(--border-subtle)]"
        >
          {MODES.map((m) => {
            const selected = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                id={`prompt-tab-${m.id}`}
                aria-selected={selected}
                aria-controls={`prompt-panel-${m.id}`}
                title={m.hint}
                data-analytics-id={`prompt-mode-${m.id}`}
                tabIndex={selected ? 0 : -1}
                onKeyDown={(event) => {
                  const index = MODES.findIndex((item) => item.id === m.id);
                  const nextIndex =
                    event.key === "ArrowRight"
                      ? (index + 1) % MODES.length
                      : event.key === "ArrowLeft"
                        ? (index + MODES.length - 1) % MODES.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? MODES.length - 1
                            : -1;
                  if (nextIndex < 0) return;
                  event.preventDefault();
                  switchMode(MODES[nextIndex].id);
                  document.getElementById(`prompt-tab-${MODES[nextIndex].id}`)?.focus();
                }}
                onClick={() => switchMode(m.id)}
                className={cn(
                  "border-b-2 px-0 py-2 text-body-sm transition-colors",
                  selected
                    ? "border-[color:var(--text-primary)] text-[color:var(--text-primary)]"
                    : "border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {generationEnabled && (
          <div
            role="tabpanel"
            id="prompt-panel-generate"
            aria-label="Create an image"
            hidden={mode !== "generate"}
            className="mt-0"
          >
            <GenerateWorkspace
              active={mode === "generate"}
              prefill={mode === "generate" ? (search.prefill ?? search.seed) : undefined}
              clearSearch={() => clearSearch("generate")}
              hideHero
            />
          </div>
        )}

        <div
          role="tabpanel"
          id="prompt-panel-build"
          aria-labelledby="prompt-tab-build"
          hidden={mode !== "build"}
          className="mt-0"
        >
          <BuildMode
            active={mode === "build"}
            search={{
              seed: mode === "build" ? search.seed : undefined,
              prefill: mode === "build" ? search.prefill : undefined,
              remixRef: mode === "build" ? search.remixRef : undefined,
              template: search.template,
              ref: mode === "build" ? search.ref : undefined,
              restore: mode === "build" ? search.restore : undefined,
            }}
            clearSearch={() => clearSearch("build")}
            clearTemplate={clearTemplate}
            onUsePrompt={(text) => {
              setPrompt(text);
              switchMode("generate");
            }}
            onCritiquePrompt={(text) => {
              setPrompt(text);
              switchMode("critique");
            }}
          />
        </div>

        <div
          role="tabpanel"
          id="prompt-panel-critique"
          aria-labelledby="prompt-tab-critique"
          hidden={mode !== "critique"}
          className="mt-0"
        >
          <CritiqueMode
            active={mode === "critique"}
            search={{
              restore: mode === "critique" ? search.restore : undefined,
              prefill: mode === "critique" ? search.prefill : undefined,
            }}
            clearSearch={() => clearSearch("critique")}
            onUsePrompt={(text) => {
              setPrompt(text);
              switchMode("generate");
            }}
          />
        </div>
      </div>
    </div>
  );
}
