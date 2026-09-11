import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { History } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { absoluteUrl } from "@/lib/site";
import { getOgImageForPath } from "@/lib/og-image";
import { JSONLD_DESCRIPTIONS, JSONLD_NAMES, ROUTES, SEO, TOOL } from "@/lib/product";
import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { BuildMode } from "@/components/prompt/BuildMode";
import { CritiqueMode } from "@/components/prompt/CritiqueMode";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Unified Prompt workspace. Generate, Build, and Critique are three modes
 * over the same object of work. All three stay mounted so each keeps its own
 * draft/result/reference while the user switches modes. /generate and
 * /critique redirect here; the APIs and history kinds are unchanged.
 *
 * Generate is only offered as a mode when the native-generation feature
 * flag is on (see lib/generation/feature-flag.ts) — Build and Critique
 * predate and don't depend on it, so the workspace must keep working
 * without it.
 */
const PROMPT_URL = absoluteUrl("/prompt");
const PROMPT_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: JSONLD_NAMES.prompt,
  url: PROMPT_URL,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any",
  description: JSONLD_DESCRIPTIONS.prompt,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export type PromptMode = "generate" | "build" | "critique";

export interface PromptSearch {
  mode?: PromptMode;
  seed?: string;
  prefill?: string;
  remixRef?: string;
  restore?: string;
  ref?: string;
  /** Template slug from /templates. Answered values live in session storage, never in the URL. */
  template?: string;
}

/** Anything that is not an explicit mode falls back to Build. */
export function parsePromptMode(value: unknown): PromptMode {
  if (value === "critique") return "critique";
  if (value === "generate") return "generate";
  return "build";
}

export const Route = createFileRoute("/prompt")({
  validateSearch: (search: Record<string, unknown>): PromptSearch => {
    const { seed, prefill, restore, ref, template } = search;
    return {
      mode: parsePromptMode(search.mode),
      template:
        typeof template === "string" && /^[a-z0-9-]{1,80}$/.test(template) ? template : undefined,
      seed: typeof seed === "string" && seed.length > 0 && seed.length <= 4000 ? seed : undefined,
      prefill:
        typeof prefill === "string" && prefill.length > 0 && prefill.length <= 4000
          ? prefill
          : undefined,
      remixRef:
        typeof search.remixRef === "string" &&
        search.remixRef.length > 0 &&
        search.remixRef.length <= 8000
          ? search.remixRef
          : undefined,
      restore: typeof restore === "string" && restore.length > 0 ? restore : undefined,
      ref: typeof ref === "string" && ref.startsWith("/gallery/") ? ref : undefined,
    };
  },
  head: () => {
    const PROMPT_OG_IMAGE = getOgImageForPath("prompt");
    return {
      meta: [
        { title: SEO.prompt.title },
        { name: "description", content: SEO.prompt.description },
        { property: "og:title", content: SEO.prompt.title },
        { property: "og:description", content: SEO.prompt.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: PROMPT_URL },
        { property: "og:image", content: PROMPT_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SEO.prompt.title },
        { name: "twitter:description", content: SEO.prompt.description },
        { name: "twitter:image", content: PROMPT_OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: PROMPT_URL }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(PROMPT_JSONLD) }],
    };
  },
  component: PromptWorkspace,
});

const ALL_MODES: ReadonlyArray<{ id: PromptMode; label: string; hint: string }> = [
  { id: "generate", label: "Generate", hint: "Create an image directly from a prompt" },
  { id: "build", label: "Build", hint: "Write a new prompt from an idea or a reference" },
  { id: "critique", label: "Critique", hint: "Score and rewrite a prompt you already have" },
];

function PromptWorkspace() {
  const search = Route.useSearch();
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
   * The template slug is kept: it is the shareable, refresh-safe form of the
   * active template context; Build mode owns the answered values.
   */
  const clearSearch = (keep: PromptMode = mode) => {
    navigate({ to: "/prompt", search: { mode: keep, template: search.template }, replace: true });
  };

  /** Remove the template context entirely (Build mode's "Remove"). */
  const clearTemplate = () => {
    navigate({ to: "/prompt", search: { mode: "build" }, replace: true });
  };

  const switchMode = (next: PromptMode) => {
    if (next === mode) return;
    trackEvent("prompt_mode_switch", { mode: next });
    navigate({ to: "/prompt", search: { mode: next, template: search.template }, replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--bg)]">
      <Header />
      <div className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">{generationEnabled ? TOOL.generate : TOOL.prompt}</p>
          {/* Drafts pile up right here, so the link to past ones lives here
              too -- not buried in the footer or an auth-gated tab. Local
              (Dexie), no sign-in needed; see src/routes/history.tsx. */}
          <Link
            to={ROUTES.history}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Link>
        </div>

        <div
          role="tablist"
          aria-label="Prompt workspace mode"
          className="mt-5 inline-flex rounded-full border border-[color:var(--border)] p-1"
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
                onClick={() => switchMode(m.id)}
                className={cn(
                  "min-w-[104px] rounded-full px-5 py-2 text-body-sm transition-colors",
                  selected
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
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
            aria-labelledby="prompt-tab-generate"
            hidden={mode !== "generate"}
            className="mt-8"
          >
            <GenerateWorkspace />
          </div>
        )}

        <div
          role="tabpanel"
          id="prompt-panel-build"
          aria-labelledby="prompt-tab-build"
          hidden={mode !== "build"}
          className="mt-8"
        >
          <BuildMode
            active={mode === "build"}
            search={{
              seed: search.seed,
              prefill: search.prefill,
              remixRef: search.remixRef,
              template: search.template,
              ref: search.ref,
              restore: mode === "build" ? search.restore : undefined,
            }}
            clearSearch={() => clearSearch("build")}
            clearTemplate={clearTemplate}
          />
        </div>

        <div
          role="tabpanel"
          id="prompt-panel-critique"
          aria-labelledby="prompt-tab-critique"
          hidden={mode !== "critique"}
          className="mt-8"
        >
          <CritiqueMode
            active={mode === "critique"}
            search={{ restore: mode === "critique" ? search.restore : undefined }}
            clearSearch={() => clearSearch("critique")}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
