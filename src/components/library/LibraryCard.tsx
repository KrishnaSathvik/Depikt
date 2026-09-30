import { RecoverableImage } from "@/components/RecoverableImage";
import { ArrowRight, LayoutTemplate, Star } from "lucide-react";
import type { BrowseEntry } from "@/lib/library-browse";
import { toggleFavoriteLocal } from "@/lib/favorites";
import { toast } from "sonner";

export function LibraryCard({
  entry,
  busy = false,
  isFavorited,
  onOpen,
  onUse,
}: {
  entry: BrowseEntry;
  busy?: boolean;
  isFavorited: boolean;
  onOpen: () => void;
  onUse: () => void;
}) {
  const label =
    entry.type === "prompts" ? "Prompt" : entry.type === "templates" ? "Template" : "Reference";
  const action =
    entry.type === "prompts"
      ? "Use prompt"
      : entry.type === "templates"
        ? "Use template"
        : "Use as reference";
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg)]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Preview ${label.toLowerCase()}: ${entry.title}`}
        className="block aspect-[4/3] w-full overflow-hidden border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] focus-visible:outline-offset-[-3px]"
      >
        {entry.image ? (
          <RecoverableImage
            src={entry.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6" aria-hidden="true">
            <div className="relative flex h-full w-4/5 flex-col justify-between rounded-sm border border-[color:var(--border-default)] bg-[color:var(--bg)] p-4 text-left shadow-sm">
              <LayoutTemplate className="h-5 w-5 text-[color:var(--text-tertiary)]" />
              <span className="line-clamp-2 text-heading-sm">{entry.title}</span>
              <div className="space-y-1.5">
                <div className="h-px w-full bg-[color:var(--border-default)]" />
                <div className="h-px w-2/3 bg-[color:var(--border-default)]" />
              </div>
            </div>
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          void toggleFavoriteLocal(
            entry.key,
            entry.type === "prompts" ? entry.prompt.source : entry.type,
          ).catch(() => toast.error("Could not update favorites"));
        }}
        aria-label={`${isFavorited ? "Remove from" : "Add to"} favorites: ${entry.title}`}
        aria-pressed={isFavorited}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg)] text-[color:var(--text-primary)]"
      >
        <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
      </button>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
          {label}
        </p>
        <h2 className="mt-2 line-clamp-2 text-heading-sm">
          <button type="button" onClick={onOpen} className="text-left hover:underline">
            {entry.title}
          </button>
        </h2>
        <p className="mt-2 line-clamp-2 text-body-sm text-[color:var(--text-secondary)]">
          {entry.description}
        </p>
        <button
          type="button"
          onClick={onUse}
          disabled={busy}
          className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-3 text-body-sm font-medium hover:underline"
        >
          {busy ? "Attaching…" : action}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
