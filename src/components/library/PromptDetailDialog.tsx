import { Copy, ExternalLink, MoreHorizontal, Sparkles, Wand2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PromptSurface } from "@/components/PromptSurface";
import { SampleImage } from "@/components/SampleImage";
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

  return (
    <Dialog open={!!prompt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto bg-[color:var(--bg-elevated)] p-0 sm:max-h-[90vh]">
        {/* 1. The sample output is the proof of the prompt, so it comes first. */}
        {prompt.thumbnail_url && (
          <SampleImage
            src={prompt.thumbnail_url}
            alt={`Sample output for ${prompt.title}`}
            maxHeightClass="max-h-[52vh] sm:max-h-[60vh]"
            className="border-b border-[color:var(--border-subtle)]"
          />
        )}
        <div className="p-6 sm:p-8">
          <DialogHeader className="pr-8">
            <p className="eyebrow">
              {prompt.category} · {TARGET_MODEL_LABELS[normalizeTargetModel(prompt.target_model)]}{" "}
              collection
              {normalizeStatus(prompt.status) !== "approved" &&
                ` · ${STATUS_LABELS[normalizeStatus(prompt.status)]}`}
            </p>
            <DialogTitle className="text-heading-lg text-[color:var(--text-primary)]">
              {prompt.title}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <PromptSurface label="Prompt">{prompt.prompt}</PromptSurface>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {generationLive && (
              <Button size="sm" onClick={handleGenerate}>
                <Sparkles className="h-3.5 w-3.5" />
                {CTA.generateWithPrompt}
              </Button>
            )}
            <Button
              size="sm"
              variant={generationLive ? "outline" : "default"}
              onClick={() => copyPrompt(prompt.prompt)}
            >
              <Copy className="h-3.5 w-3.5" />
              {CTA.copyPrompt}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" aria-label={CTA.more}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
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
            <div className="mt-6 border-t border-[color:var(--border-subtle)] pt-6">
              <p className="eyebrow mb-2">Why it works</p>
              <p className="text-body-md text-[color:var(--text-secondary)]">
                {prompt.why_it_works}
              </p>
            </div>
          )}

          {/* Provenance line: only Images 2.5 rows carry a source type other than the default. */}
          {normalizeTargetModel(prompt.target_model) === "gpt-image-2.5" && (
            <p className="mt-4 text-[13px] text-[color:var(--text-tertiary)]">
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
