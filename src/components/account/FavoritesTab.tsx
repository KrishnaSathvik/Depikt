import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { fetchLibrary } from "@/lib/library";
import { useFavoriteIds } from "@/lib/favorites";
import { PromptCard } from "@/components/library/PromptCard";
import { PromptDetailDialog } from "@/components/library/PromptDetailDialog";
import type { LibraryPrompt } from "@/types/library";

/**
 * Prompts starred from the Library. Favoriting itself still happens on
 * Library's own cards (the star icon) — this tab is just where the saved
 * list lives now, out of Library's public browsing surface.
 *
 * Favorites are local to this browser (Dexie/IndexedDB, see
 * src/lib/favorites.ts) — not yet synced to the account server-side, so
 * they won't follow you to a different device or browser.
 */
export function FavoritesTab() {
  const favoriteIds = useFavoriteIds();
  const [prompts, setPrompts] = useState<LibraryPrompt[] | null>(null);
  const [selected, setSelected] = useState<LibraryPrompt | null>(null);

  useEffect(() => {
    fetchLibrary()
      .then(setPrompts)
      .catch(() => setPrompts([]));
  }, []);

  const favorited = (prompts ?? []).filter((p) => favoriteIds.has(`${p.source}-${p.id}`));

  return (
    <div>
      <h1 className="text-heading-md">Favorites</h1>
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
        Prompts you've saved from the Library.
      </p>

      <div className="mt-6">
        {prompts === null ? (
          <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
        ) : favorited.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]">
              <Star className="h-4 w-4 text-[color:var(--text-tertiary)]" />
            </div>
            <p className="text-body-sm text-[color:var(--text-tertiary)]">
              No favorites yet. Star prompts in the Library to save them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px border border-[color:var(--border-subtle)] bg-[color:var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-3">
            {favorited.map((p) => (
              <PromptCard
                key={`${p.source}-${p.id}`}
                prompt={p}
                onOpen={() => setSelected(p)}
                isFavorited
              />
            ))}
          </div>
        )}
      </div>

      <PromptDetailDialog prompt={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
