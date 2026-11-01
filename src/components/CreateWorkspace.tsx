import { CreatorDraftProvider, useCreatorDraft } from "@/components/CreatorDraft";
import { TOOL } from "@/lib/product";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { BuildMode } from "@/components/prompt/BuildMode";
import { CritiqueMode } from "@/components/prompt/CritiqueMode";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ScanSearch, Sparkles, Wand2, type LucideIcon } from "lucide-react";

import { parsePromptMode, type PromptMode } from "@/lib/creator-search";
const ALL_MODES: ReadonlyArray<{ id: PromptMode; label: string; hint: string }> = [
  { id: "generate", label: TOOL.generate, hint: "Create an image from a prompt or reference" },
  { id: "build", label: TOOL.improvePrompt, hint: "Refine a prompt before generating" },
  { id: "critique", label: TOOL.critique, hint: "Score and rewrite a prompt you already have" },
];
/** Two-part headlines: the second part carries the studio gradient. */
const MODE_HEADLINES: Record<PromptMode, readonly [string, string]> = {
  generate: ["Describe it.", "See it."],
  build: ["Rough idea in.", "Precise prompt out."],
  critique: ["Find what your prompt", "is missing."],
};
const MODE_ICONS: Record<PromptMode, LucideIcon> = {
  generate: Sparkles,
  build: Wand2,
  critique: ScanSearch,
};

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

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <div>
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-4 sm:px-6">
        {/* Segmented mode switcher: one quiet track, the active tool raised. */}
        <div
          role="tablist"
          aria-label="Creation tools"
          aria-describedby="creator-mode-hint"
          className="mx-auto flex w-full gap-1 rounded-full bg-[color:var(--studio-track)] p-1 ring-1 ring-[color:var(--border-subtle)] backdrop-blur sm:w-fit"
        >
          {MODES.map((m) => {
            const selected = m.id === mode;
            const Icon = MODE_ICONS[m.id];
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
                  "inline-flex min-h-11 min-w-0 flex-auto items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors sm:min-h-9 sm:flex-none sm:px-4 sm:text-body-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-1",
                  selected
                    ? "bg-[color:var(--text-primary)] text-[color:var(--bg)]"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
                )}
              >
                <Icon className="hidden h-4 w-4 shrink-0 min-[420px]:block" aria-hidden />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mx-auto mb-8 mt-8 max-w-[880px] text-center sm:mb-10 sm:mt-12">
          <h2 className="text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-[44px]">
            {MODE_HEADLINES[activeMode.id][0]}{" "}
            <span className="studio-gradient-text">{MODE_HEADLINES[activeMode.id][1]}</span>
          </h2>
          <p
            id="creator-mode-hint"
            aria-live="polite"
            className="mt-4 text-body-md text-[color:var(--text-secondary)] sm:text-[17px]"
          >
            {activeMode.hint}.
          </p>
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
