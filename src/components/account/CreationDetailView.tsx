import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PromptSurface } from "@/components/PromptSurface";
import { simplifyRatioLabel } from "@/lib/generation/use-generation";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import { downloadFile } from "@/lib/download-file";
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

/**
 * One creation's image, metadata, prompt, and actions -- the AccountHub's
 * "creation-detail" view body. No Dialog of its own; the hub shell
 * supplies the surrounding chrome (title, back arrow, close).
 */
export function CreationDetailView({ creation }: { creation: CreationItem }) {
  const navigate = useNavigate();

  function download() {
    if (!creation.url) return;
    trackEvent("creation_downloaded", {});
    const filename = `depikt-${creation.createdAt.slice(0, 10)}-${creation.id.slice(0, 8)}.png`;
    void downloadFile(creation.url, filename);
  }

  function openInGenerate() {
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
    <div>
      <div className="bg-[color:var(--bg-subtle)] p-4">
        {creation.url ? (
          <img
            src={creation.url}
            alt=""
            className="mx-auto max-h-[55vh] w-auto rounded-md object-contain"
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
  );
}
