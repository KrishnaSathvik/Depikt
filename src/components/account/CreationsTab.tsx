import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreationDetailDialog } from "@/components/account/CreationDetailDialog";
import { getCreations, type CreationItem } from "@/lib/profile/client";
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

export function CreationsTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<CreationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<CreationItem | null>(null);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    setError(false);
    try {
      const page = await getCreations({ type: f });
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch {
      setError(true);
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
      <h1 className="text-heading-md">Creations</h1>
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">Your generated images.</p>

      <div className="mt-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              filter === f.id
                ? "border-[color:var(--text-primary)] bg-[color:var(--text-primary)] text-[color:var(--bg)]"
                : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
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
                    setSelected(item);
                    trackEvent("creation_opened", {});
                  }}
                  className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-lg border border-[color:var(--border-subtle)] text-left"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt=""
                      style={{ aspectRatio: `${item.width} / ${item.height}` }}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{ aspectRatio: `${item.width} / ${item.height}` }}
                      className="flex items-center justify-center bg-[color:var(--bg-subtle)] text-[12px] text-[color:var(--text-tertiary)]"
                    >
                      Unavailable
                    </div>
                  )}
                  <p className="px-2 py-1.5 text-[12px] text-[color:var(--text-tertiary)]">
                    {formatShort(item.createdAt)}
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

      <CreationDetailDialog creation={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
