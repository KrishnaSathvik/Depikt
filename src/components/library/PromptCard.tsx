import { useEffect, useState } from "react";
import { CoverArt } from "@/components/library/CoverArt";
import { cn } from "@/lib/utils";
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
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [prompt.thumbnail_url]);
  const hasImage = !!prompt.thumbnail_url && !failed;
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
      className="surface-card surface-card-interactive group relative flex cursor-pointer flex-col overflow-hidden p-2 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
    >
      {/* Star icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavoriteLocal(`${prompt.source}-${prompt.id}`, prompt.source);
        }}
        className={cn(
          "absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/85 text-[color:var(--text-primary)] shadow-[0_4px_14px_-6px_rgba(17,17,17,0.35)] backdrop-blur-md transition-transform hover:scale-105 sm:h-9 sm:w-9",
          isFavorited && "text-[color:var(--accent-orange)]",
        )}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={cn("h-4 w-4", isFavorited && "fill-current")} />
      </button>

      {/* Thumbnail: square frame, whole image — landscape and portrait results are never cropped. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-[color:var(--bg-subtle)]">
        {hasImage ? (
          <img
            src={prompt.thumbnail_url!}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <CoverArt
            seed={`${prompt.source}-${prompt.id}`}
            title={prompt.title}
            kicker={prompt.category}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-4">
        <h2 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[color:var(--text-primary)]">
          {prompt.title}
        </h2>
        <p className="line-clamp-2 text-[13.5px] leading-relaxed text-[color:var(--text-secondary)]">
          {prompt.prompt}
        </p>
        <span className="mt-auto flex items-center gap-1 pt-3 text-[13px] font-medium text-[color:var(--text-primary)] underline-offset-4 group-hover:underline">
          View prompt
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
}
