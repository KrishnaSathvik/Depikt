import { useEffect, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import type { BrowseEntry } from "@/lib/library-browse";
import { toggleFavoriteLocal } from "@/lib/favorites";
import { CoverArt } from "@/components/library/CoverArt";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Card media: the real image when it loads, otherwise intentional cover art. */
function CardMedia({ entry }: { entry: BrowseEntry }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [entry.image]);
  const kicker =
    entry.type === "prompts"
      ? entry.prompt.category
      : entry.type === "templates"
        ? (entry.categories[0] ?? "Guided brief")
        : "Reference";

  if (!entry.image || failed) {
    return (
      <CoverArt
        seed={entry.key}
        title={entry.title}
        kicker={kicker}
        variant={entry.type === "templates" ? "template" : "prompt"}
        className="transition-transform duration-300 ease-out group-hover:scale-[1.02]"
      />
    );
  }
  return (
    <div className="relative h-full w-full bg-[color:var(--bg-subtle)]">
      {/* Blurred fill behind a contained image: whole result visible, no letterbox bars. */}
      <img
        src={entry.image}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
      />
      <img
        src={entry.image}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="relative h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
}

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
    <article className="surface-card surface-card-interactive group relative flex h-full flex-col overflow-hidden p-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Preview ${label.toLowerCase()}: ${entry.title}`}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
      >
        <CardMedia entry={entry} />
        <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11.5px] font-medium text-[color:var(--text-primary)] shadow-[0_2px_8px_-4px_rgba(17,17,17,0.3)] backdrop-blur-md">
          {label}
        </span>
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
        className={cn(
          "absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/85 text-[color:var(--text-primary)] shadow-[0_4px_14px_-6px_rgba(17,17,17,0.35)] backdrop-blur-md transition-transform hover:scale-105 sm:h-9 sm:w-9",
          isFavorited && "text-[color:var(--accent-orange)]",
        )}
      >
        <Star className={cn("h-4 w-4", isFavorited && "fill-current")} />
      </button>
      <div className="flex flex-1 flex-col px-3 pb-2 pt-4">
        <h2 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[color:var(--text-primary)]">
          <button
            type="button"
            onClick={onOpen}
            className="-my-2 block w-full py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
          >
            {entry.title}
          </button>
        </h2>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-[color:var(--text-secondary)]">
          {entry.description}
        </p>
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={onUse}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[color:var(--border-default)] px-4 text-[13px] font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--ink)] hover:bg-[color:var(--ink)] hover:text-[color:var(--ink-text)] disabled:opacity-50 sm:min-h-9"
          >
            {busy ? "Attaching…" : action}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
