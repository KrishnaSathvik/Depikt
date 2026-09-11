import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PromptSurface } from "@/components/PromptSurface";
import { simplifyRatioLabel } from "@/lib/generation/use-generation";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import type { CreationItem } from "@/lib/profile/client";
import { ROUTES } from "@/lib/product";
import { trackEvent } from "@/lib/analytics";

function orientationOf(width: number, height: number): "Square" | "Portrait" | "Landscape" {
  if (width === height) return "Square";
  return width < height ? "Portrait" : "Landscape";
}

function formatCreationDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CreationDetailDialog({
  creation,
  onOpenChange,
}: {
  creation: CreationItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  function download() {
    if (!creation?.url) return;
    trackEvent("creation_downloaded", {});
    const a = document.createElement("a");
    a.href = creation.url;
    a.download = `depikt-${creation.createdAt.slice(0, 10)}-${creation.id.slice(0, 8)}.png`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  function openInGenerate() {
    if (!creation) return;
    trackEvent("creation_opened_in_generate", {});
    saveGenerationHandoff({
      prompt: creation.prompt,
      references: [],
      sourceType: "direct",
      sourceVersion: {
        id: creation.id,
        previewUrl: creation.url,
        width: creation.width,
        height: creation.height,
        prompt: creation.prompt,
        model: creation.model,
        createdAt: creation.createdAt,
      },
    });
    void navigate({ to: ROUTES.legacyBuilder });
  }

  return (
    <Dialog open={Boolean(creation)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-0 p-0">
        {creation && (
          <div className="max-h-[85vh] overflow-y-auto">
            <DialogTitle className="sr-only">Creation detail</DialogTitle>
            <div className="bg-[color:var(--bg-subtle)] p-4">
              {creation.url ? (
                <img
                  src={creation.url}
                  alt=""
                  className="mx-auto max-h-[60vh] w-auto rounded-md object-contain"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-body-sm text-[color:var(--text-tertiary)]">
                  Image unavailable
                </div>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div>
                <p className="text-body-sm text-[color:var(--text-secondary)]">
                  {creation.operation === "edit" ? "Edited" : "Generated"}{" "}
                  {formatCreationDate(creation.createdAt)}
                </p>
                <p className="text-body-sm text-[color:var(--text-tertiary)]">
                  {simplifyRatioLabel(creation.width, creation.height)} ·{" "}
                  {orientationOf(creation.width, creation.height)}
                  {creation.parentVersionId && " · Edited from a previous version"}
                </p>
              </div>

              <div>
                <p className="eyebrow">Prompt</p>
                <div className="mt-2">
                  <PromptSurface>{creation.prompt}</PromptSurface>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={download} disabled={!creation.url}>
                  Download
                </Button>
                <Button size="sm" onClick={openInGenerate}>
                  Open in Generate
                </Button>
              </div>

              <details className="text-body-sm text-[color:var(--text-tertiary)]">
                <summary className="cursor-pointer select-none text-[color:var(--text-secondary)]">
                  Details
                </summary>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between gap-4">
                    <dt>Dimensions</dt>
                    <dd className="tabular-nums text-[color:var(--text-primary)]">
                      {creation.width} × {creation.height}
                    </dd>
                  </div>
                </dl>
              </details>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
