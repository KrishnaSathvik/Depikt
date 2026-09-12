import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCreations, type CreationItem } from "@/lib/profile/client";
import { readCreationsCache, writeCreationsCache } from "@/lib/profile/creations-cache";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Filter = "all" | "generated" | "edited";
const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "generated", label: "Generated" },
  { id: "edited", label: "Edited" },
];

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Filter pills + the image-first masonry grid + load more. No heading and
 * no detail dialog of its own -- whoever's hosting this supplies the
 * heading (the full-page Creations tab and the AccountHub's home view
 * both do), and a tapped thumbnail is reported via `onSelect` to open the
 * AccountHub's creation-detail view.
 *
 * Hydrates synchronously from a per-filter in-memory cache (see
 * creations-cache.ts) so re-opening the profile shows the same images
 * immediately instead of a "Loading…" flash -- this component mounts
 * fresh every time the AccountHub's home view opens. The server fetch
 * still runs every time in the background and overwrites the cache; the
 * cache is never treated as authoritative.
 */
export function CreationsGrid({ onSelect }: { onSelect: (item: CreationItem) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<CreationItem[]>(() => readCreationsCache("all")?.items ?? []);
  const [cursor, setCursor] = useState<string | null>(
    () => readCreationsCache("all")?.nextCursor ?? null,
  );
  const [loading, setLoading] = useState(() => !readCreationsCache("all"));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (f: Filter) => {
    const cached = readCreationsCache(f);
    if (cached) {
      setItems(cached.items);
      setCursor(cached.nextCursor);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(false);
    try {
      const page = await getCreations({ type: f });
      setItems(page.items);
      setCursor(page.nextCursor);
      writeCreationsCache(f, page);
    } catch {
      if (!cached) setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await getCreations({ type: filter, cursor });
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // Leave existing items visible; the button just stays available to retry.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <div className="inline-flex gap-0.5 rounded-full bg-[color:var(--bg-subtle)] p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              filter === f.id
                ? "bg-[color:var(--bg)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-body-sm text-[color:var(--text-tertiary)]">Loading…</p>
        ) : error ? (
          <p className="text-body-sm text-red-600">Could not load your creations right now.</p>
        ) : items.length === 0 ? (
          <p className="text-body-sm text-[color:var(--text-tertiary)]">
            Nothing here yet — images you generate or edit will show up here.
          </p>
        ) : (
          <>
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    trackEvent("creation_opened", {});
                  }}
                  className="group mb-3 block w-full break-inside-avoid text-left"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt=""
                      style={{ aspectRatio: `${item.width} / ${item.height}` }}
                      className="w-full rounded-md object-cover transition-opacity group-hover:opacity-90"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{ aspectRatio: `${item.width} / ${item.height}` }}
                      className="flex items-center justify-center rounded-md bg-[color:var(--bg-subtle)] text-[12px] text-[color:var(--text-tertiary)]"
                    >
                      Unavailable
                    </div>
                  )}
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[color:var(--text-tertiary)]">
                    {formatShort(item.createdAt)}
                    {item.operation && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.operation === "edit" ? "Edited" : "Generated"}</span>
                      </>
                    )}
                  </p>
                </button>
              ))}
            </div>

            {cursor && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
