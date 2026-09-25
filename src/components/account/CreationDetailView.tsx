import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteCreationDialog } from "@/components/account/DeleteCreationDialog";
import { PromptSurface } from "@/components/PromptSurface";
import { simplifyRatioLabel } from "@/lib/generation/use-generation";
import { saveGenerationHandoff } from "@/lib/generation/handoff";
import { downloadFile } from "@/lib/download-file";
import { deleteCreation, getCreationDetail, type CreationItem } from "@/lib/profile/client";
import { CREATIONS_COPY, ROUTES } from "@/lib/product";
import { promptCaption, userFacingPrompt } from "@/lib/generation/user-facing-prompt";
import { useAccountHub } from "./AccountHubProvider";
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
export function CreationDetailView({
  creation: initialCreation,
  onDeleted,
}: {
  creation: CreationItem;
  onDeleted?: () => void;
}) {
  const [detail, setDetail] = useState<
    import("@/lib/profile/creation-detail").CreationDetail | null
  >(null);
  const [selectedId, setSelectedId] = useState(initialCreation.id);
  const [detailError, setDetailError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setDetailError(false);
    setSelectedId(initialCreation.id);
    getCreationDetail(initialCreation.id).then(
      (result) => {
        if (!cancelled) setDetail(result);
      },
      () => {
        if (!cancelled) setDetailError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [initialCreation.id]);
  const saved = detail?.versions.find((v) => v.id === selectedId);
  const creation = saved ?? initialCreation;
  const navigate = useNavigate();
  const { closeHub } = useAccountHub();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function download() {
    if (!creation.url) return;
    trackEvent("creation_downloaded", {});
    const filename = `depikt-${creation.createdAt.slice(0, 10)}-${creation.id.slice(0, 8)}.png`;
    void downloadFile(creation.url, filename);
  }

  function openInGenerate() {
    trackEvent("creation_opened_in_generate", {});
    saveGenerationHandoff({
      prompt: userFacingPrompt(creation.prompt),
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
    closeHub();
    void navigate({ to: ROUTES.legacyBuilder });
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteCreation(creation.id);
      trackEvent("creation_deleted", {});
      setConfirmOpen(false);
      toast.success("Image deleted.");
      onDeleted?.();
    } catch {
      toast.error("Could not delete this image. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="bg-[color:var(--bg-subtle)] p-4">
        {creation.url ? (
          <img
            src={creation.url}
            alt={promptCaption(creation.prompt, 120) || "Generated image"}
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
            {creation.operation === "edit"
              ? CREATIONS_COPY.edited
              : creation.parentVersionId
                ? CREATIONS_COPY.updated
                : CREATIONS_COPY.generated}{" "}
            {formatCreationDate(creation.createdAt)}
          </p>
          <p className="text-body-sm text-[color:var(--text-tertiary)]">
            {simplifyRatioLabel(creation.width, creation.height)} ·{" "}
            {orientationOf(creation.width, creation.height)}
            {creation.seriesLabel ? ` · ${creation.seriesLabel}` : ""}
            {creation.parentVersionId &&
              (creation.operation === "edit"
                ? " · Edited from a previous version"
                : " · From a previous version")}
          </p>
        </div>

        {saved?.lineage && <p className="text-body-sm">{saved.lineage}</p>}
        {saved?.statusLines.map((line, index) => (
          <p key={index} className="text-body-sm">
            {line.title}
            {line.detail ? ` · ${line.detail}` : ""}
          </p>
        ))}
        {!!saved?.sources.length && (
          <details>
            <summary>Sources ({saved.sources.length})</summary>
            <ul className="mt-2 space-y-2">
              {saved.sources.map((source) => (
                <li key={source.url}>
                  <a
                    className="underline"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        {detail && detail.versions.length > 1 && (
          <div aria-label="Saved versions" className="flex flex-wrap gap-2">
            {detail.versions.map((version, index) => (
              <Button
                key={version.id}
                variant={version.id === selectedId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedId(version.id)}
                aria-pressed={version.id === selectedId}
              >
                {version.seriesLabel ?? `Version ${index + 1}`}
                {version.lineage ? ` · ${version.lineage}` : ""}
              </Button>
            ))}
          </div>
        )}
        {detailError && (
          <p role="status" className="text-body-sm">
            Saved history is unavailable right now.
          </p>
        )}
        <div>
          <p className="eyebrow">Prompt</p>
          <div className="mt-2">
            <PromptSurface>{userFacingPrompt(creation.prompt)}</PromptSurface>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={download} disabled={!creation.url}>
            Download
          </Button>
          <Button size="sm" onClick={openInGenerate}>
            Open in Generate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
            Delete
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

      <DeleteCreationDialog
        open={confirmOpen}
        deleting={deleting}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
