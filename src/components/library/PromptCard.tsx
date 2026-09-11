import { ArrowRight, Star } from "lucide-react";
import { toggleFavoriteLocal } from "@/lib/favorites";
import type { LibraryPrompt } from "@/types/library";

/**
 * One prompt card — used by both /library's Browse grid and Account's
 * Favorites tab, so favoriting looks and behaves identically in both
 * places. Favorites are local/per-browser (Dexie/IndexedDB, see
 * src/lib/favorites.ts) — not yet synced to the account server-side.
 */
export function PromptCard({
  prompt,
  onOpen,
  isFavorited,
}: {
  prompt: LibraryPrompt;
  onOpen: () => void;
  isFavorited: boolean;
}) {
  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View prompt: ${prompt.title}`}
      className="group relative flex cursor-pointer flex-col bg-[color:var(--bg-elevated)] transition-colors hover:bg-[color:var(--bg-muted)] focus-visible:z-10"
    >
      {/* Star icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavoriteLocal(`${prompt.source}-${prompt.id}`, prompt.source);
        }}
        className={`absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          prompt.thumbnail_url ? "bg-black/40 backdrop-blur-sm" : "bg-[color:var(--bg-subtle)]"
        } ${
          isFavorited
            ? "text-[color:var(--accent-orange)] opacity-100"
            : "text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-[color:var(--accent-orange)]"
        }`}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
      </button>

      {/* Thumbnail */}
      {prompt.thumbnail_url ? (
        <div className="relative aspect-square w-full overflow-hidden bg-[color:var(--bg-subtle)]">
          {/* Square frame, whole image: landscape and portrait results are never cropped. */}
          <img
            src={prompt.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex aspect-[3/1] items-end px-5 pt-5 sm:aspect-auto">
          <span className="text-[13px] font-medium text-[color:var(--text-tertiary)]">
            {prompt.category}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-heading-sm text-[color:var(--text-primary)] line-clamp-2">
          {prompt.title}
        </h2>
        <p className="line-clamp-2 text-body-sm text-[color:var(--text-secondary)]">
          {prompt.prompt}
        </p>
        <span className="mt-auto flex items-center gap-1 pt-3 text-body-sm font-medium text-[color:var(--text-primary)] underline-offset-4 group-hover:underline">
          View prompt
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
}
