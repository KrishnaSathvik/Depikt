import { Copy, ExternalLink, Lightbulb, MoreHorizontal, Sparkles, Wand2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PromptSurface } from "@/components/PromptSurface";
import { SampleImage } from "@/components/SampleImage";
import { CoverArt, coverGradient } from "@/components/library/CoverArt";
import { cn } from "@/lib/utils";
import { copyPrompt, openInImago } from "@/lib/library";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import { CTA, ROUTES } from "@/lib/product";
import { TARGET_MODEL_LABELS, normalizeTargetModel } from "@/lib/target-model";
import {
  SOURCE_TYPE_LABELS,
  STATUS_LABELS,
  normalizeSourceType,
  normalizeStatus,
} from "@/lib/library-metadata";
import type { LibraryPrompt } from "@/types/library";

/** The full prompt detail view — used by /library and Account's Favorites tab. */
export function PromptDetailDialog({
  prompt,
  onClose,
}: {
  prompt: LibraryPrompt | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!prompt) return null;

  const handleGenerate = () => {
    saveGenerationHandoff({
      prompt: prompt.prompt,
      references: [],
      structuredAspectRatio: null,
      routingHints: prompt.category ? { category: prompt.category } : undefined,
      sourceType: "library",
      sourceId: prompt.id,
    });
    void navigate({ to: ROUTES.legacyBuilder });
  };

  const generationLive = isNativeGenerationEnabled();

  const model = normalizeTargetModel(prompt.target_model);
  const status = normalizeStatus(prompt.status);
  const hasImage = !!prompt.thumbnail_url;
  const cover = (
    <div className="h-44 sm:h-60 md:h-full">
      <CoverArt
        seed={`${prompt.source}-${prompt.id}`}
        title={prompt.title}
        kicker={prompt.category}
      />
    </div>
  );
  const metaPill =
    "inline-flex items-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-2.5 py-1 text-[12px] font-medium text-[color:var(--text-secondary)]";

  return (
    <Dialog open={!!prompt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[92vh] w-[calc(100%-1rem)] flex-col gap-0 overflow-y-auto rounded-[24px] bg-[color:var(--bg-elevated)] p-0 sm:rounded-[24px] [&>button:last-child]:z-10 [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:bg-white/85 [&>button:last-child]:text-[color:var(--text-primary)] [&>button:last-child]:shadow-[0_4px_14px_-6px_rgba(17,17,17,0.35)] [&>button:last-child]:backdrop-blur-md",
          hasImage
            ? "max-w-6xl md:grid md:max-h-[86vh] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:overflow-hidden"
            : "max-w-3xl",
        )}
      >
        {/* 1. The sample output is the proof of the prompt, so it comes first. */}
        {hasImage ? (
          <div className="relative shrink-0 overflow-hidden bg-[color:var(--bg-subtle)] md:h-full md:min-h-[520px]">
            <SampleImage
              src={prompt.thumbnail_url!}
              alt={`Sample output for ${prompt.title}`}
              maxHeightClass="max-h-[46vh] md:max-h-[86vh]"
              className="md:h-full"
              fallback={cover}
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="relative h-24 shrink-0 overflow-hidden sm:h-28"
            style={{ backgroundImage: coverGradient(`${prompt.source}-${prompt.id}`) }}
          >
            <span className="absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/70" />
            <span className="absolute right-16 -top-10 h-28 w-28 rounded-full border border-white/60" />
          </div>
        )}
        <div
          className={cn(
            "flex min-h-0 flex-col p-6 sm:p-8",
            hasImage ? "md:overflow-y-auto md:p-10" : "sm:px-10 sm:pb-10",
          )}
        >
          <div className="flex flex-wrap gap-1.5 pr-10">
            <span className={metaPill}>{prompt.category}</span>
            <span className={metaPill}>{TARGET_MODEL_LABELS[model]} collection</span>
            {status !== "approved" && (
              <span className={metaPill}>{STATUS_LABELS[normalizeStatus(prompt.status)]}</span>
            )}
          </div>
          <DialogTitle className="mt-4 text-balance text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] text-[color:var(--text-primary)] sm:text-[30px]">
            {prompt.title}
          </DialogTitle>

          <div className="mt-6">
            <PromptSurface label="Prompt">{prompt.prompt}</PromptSurface>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {generationLive && (
              <Button variant="brand" onClick={handleGenerate} className="min-h-11">
                <Sparkles className="h-4 w-4" />
                {CTA.generateWithPrompt}
              </Button>
            )}
            <Button
              variant={generationLive ? "outline" : "default"}
              onClick={() => copyPrompt(prompt.prompt)}
              className="min-h-11"
            >
              <Copy className="h-4 w-4" />
              {CTA.copyPrompt}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label={CTA.more} className="min-h-11">
                  <MoreHorizontal className="h-4 w-4" />
                  {CTA.more}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link
                    to="/prompt"
                    search={{
                      mode: "build" as const,
                      prefill: prompt.user_input || prompt.prompt,
                      remixRef: prompt.prompt,
                    }}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {CTA.remix}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openInImago(prompt.prompt)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  {CTA.openImago}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {prompt.why_it_works && (
            <div className="mt-8 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-muted)] p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[color:var(--text-primary)]">
                <Lightbulb
                  className="h-4 w-4 text-[color:var(--accent-orange)]"
                  aria-hidden="true"
                />
                Why it works
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
                {prompt.why_it_works}
              </p>
            </div>
          )}

          {/* Provenance line: only Images 2.5 rows carry a source type other than the default. */}
          {model === "gpt-image-2.5" && (
            <p className="mt-5 text-[13px] text-[color:var(--text-tertiary)]">
              {SOURCE_TYPE_LABELS[normalizeSourceType(prompt.source_type)]}
              {prompt.source_creator ? ` · ${prompt.source_creator}` : ""}
              {prompt.source_url ? (
                <>
                  {" · "}
                  <a
                    href={prompt.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    source
                  </a>
                </>
              ) : null}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
