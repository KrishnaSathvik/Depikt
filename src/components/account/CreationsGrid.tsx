import { RecoverableImage } from "@/components/RecoverableImage";
import { groupCreations } from "@/lib/profile/creation-groups";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteCreationDialog } from "@/components/account/DeleteCreationDialog";
import {
  deleteCreation,
  getCreations,
  getCreationDetail,
  type CreationItem,
} from "@/lib/profile/client";
import { readCreationsCache, writeCreationsCache } from "@/lib/profile/creations-cache";
import { trackEvent } from "@/lib/analytics";
import { CREATIONS_COPY } from "@/lib/product";
import { promptCaption } from "@/lib/generation/user-facing-prompt";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { privateScope, isCurrentPrivateScope, type PrivateScope } from "@/lib/private-cache";

type Filter = "all" | "generated" | "edited";
const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "generated", label: "Generated" },
  { id: "edited", label: "Edited" },
];

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function creationKindLabel(item: CreationItem): string {
  if (item.operation === "edit") return CREATIONS_COPY.edited;
  if (item.parentVersionId) return CREATIONS_COPY.updated;
  return CREATIONS_COPY.generated;
}

function CreationTile({
  item,
  onSelect,
  onDelete,
}: {
  item: CreationItem;
  onSelect: (item: CreationItem) => void;
  onDelete: (item: CreationItem) => void;
}) {
  const caption = promptCaption(item.prompt);
  const kind = creationKindLabel(item);
  return (
    <div className="group relative mb-4 break-inside-avoid">
      <button
        type="button"
        onClick={() => {
          onSelect(item);
          trackEvent("creation_opened", {});
        }}
        className="block w-full rounded-[16px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
      >
        {item.url ? (
          <RecoverableImage
            src={item.url}
            refreshUrl={async () =>
              (await getCreationDetail(item.id)).versions.find((v) => v.id === item.id)?.url
            }
            alt={item.seriesLabel || caption || kind}
            style={{ aspectRatio: `${item.width} / ${item.height}` }}
            className="w-full rounded-[16px] bg-[color:var(--bg-subtle)] object-cover shadow-[0_0_0_1px_rgba(17,17,17,0.05)] transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_0_1px_rgba(17,17,17,0.06),0_18px_36px_-20px_rgba(17,17,17,0.4)] motion-reduce:group-hover:translate-y-0"
            loading="lazy"
          />
        ) : (
          <div
            style={{ aspectRatio: `${item.width} / ${item.height}` }}
            className="flex items-center justify-center rounded-[16px] border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] text-[12px] text-[color:var(--text-tertiary)]"
          >
            Unavailable
          </div>
        )}
        <p className="mt-2 line-clamp-2 px-0.5 text-[13px] leading-snug text-[color:var(--text-primary)]">
          {item.seriesLabel || caption || kind}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 px-0.5 text-[12px] text-[color:var(--text-tertiary)]">
          {formatShort(item.createdAt)}
          <span aria-hidden="true">·</span>
          <span>{kind}</span>
        </p>
      </button>
      <button
        type="button"
        aria-label="Delete image"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(item);
        }}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white opacity-100 shadow-sm transition-opacity hover:bg-black/80 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
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
  const { user } = useAuth();
  if (!user) return null;
  const scope = privateScope(user.id);
  return (
    <OwnedCreationsGrid key={`${scope.userId}:${scope.epoch}`} scope={scope} onSelect={onSelect} />
  );
}

function OwnedCreationsGrid({
  scope,
  onSelect,
}: {
  scope: PrivateScope;
  onSelect: (item: CreationItem) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<CreationItem[]>(
    () => readCreationsCache(scope, "all")?.items ?? [],
  );
  const [cursor, setCursor] = useState<string | null>(
    () => readCreationsCache(scope, "all")?.nextCursor ?? null,
  );
  const [loading, setLoading] = useState(() => !readCreationsCache(scope, "all"));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CreationItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletedIds = useRef(new Set<string>());
  const requestId = useRef(0);
  const ownerScope = useRef(scope).current;

  const load = useCallback(
    async (f: Filter) => {
      const request = ++requestId.current;
      const current = () => request === requestId.current && isCurrentPrivateScope(ownerScope);
      const cached = readCreationsCache(ownerScope, f);
      if (cached) {
        setItems(cached.items.filter((item) => !deletedIds.current.has(item.id)));
        setCursor(cached.nextCursor);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(false);
      try {
        const page = await getCreations({ type: f });
        if (!current()) return;
        const items = page.items.filter((item) => !deletedIds.current.has(item.id));
        setItems(items);
        setCursor(page.nextCursor);
        writeCreationsCache(ownerScope, f, { ...page, items });
      } catch {
        if (!current()) return;
        if (!cached) setError(true);
      } finally {
        if (current()) setLoading(false);
      }
    },
    [ownerScope],
  );

  useEffect(() => {
    void load(filter);
    return () => {
      requestId.current += 1;
    };
  }, [filter, load]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCreation(pendingDelete.id);
      if (!isCurrentPrivateScope(ownerScope)) return;
      deletedIds.current.add(pendingDelete.id);
      trackEvent("creation_deleted", {});
      setItems((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("Image deleted.");
    } catch {
      toast.error("Could not delete this image. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    const request = requestId.current;
    const current = () => request === requestId.current && isCurrentPrivateScope(ownerScope);
    setLoadingMore(true);
    try {
      const page = await getCreations({ type: filter, cursor });
      if (!current()) return;
      setItems((prev) => {
        const next = [...prev, ...page.items.filter((item) => !deletedIds.current.has(item.id))];
        writeCreationsCache(ownerScope, filter, { items: next, nextCursor: page.nextCursor });
        return next;
      });
      setCursor(page.nextCursor);
    } catch {
      // Leave existing items visible; the button just stays available to retry.
    } finally {
      if (current()) setLoadingMore(false);
    }
  }

  return (
    <div>
      <div className="inline-flex gap-1 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-colors",
              filter === f.id
                ? "bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] shadow-[0_1px_2px_rgba(17,17,17,0.08),0_4px_12px_-6px_rgba(17,17,17,0.18)]"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4" aria-busy="true">
            <span className="sr-only">Loading…</span>
            {[4 / 5, 1, 3 / 4, 1, 4 / 5, 3 / 4].map((ratio, i) => (
              <div
                key={i}
                aria-hidden
                style={{ aspectRatio: ratio }}
                className="mb-4 w-full animate-pulse break-inside-avoid rounded-[16px] bg-[color:var(--bg-subtle)]"
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-body-sm text-red-600">Could not load your creations right now.</p>
        ) : items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-6 py-14 text-center">
            <p className="text-[15px] text-[color:var(--text-secondary)]">{CREATIONS_COPY.empty}</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {groupCreations(items).map((batch) =>
                batch.kind === "series" ? (
                  <div
                    key={batch.items[0].sessionId ?? batch.items[0].id}
                    className="surface-card p-3 sm:p-4"
                  >
                    <p className="mb-3 text-[13px] text-[color:var(--text-secondary)]">
                      {CREATIONS_COPY.series(batch.items.length)}
                      <span className="block">
                        Saved outputs shown. Load more to include older outputs.
                      </span>
                    </p>
                    <div className="columns-2 gap-4 sm:columns-3">
                      {batch.items.map((item) => (
                        <CreationTile
                          key={item.id}
                          item={item}
                          onSelect={onSelect}
                          onDelete={setPendingDelete}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    key={batch.items[0].id}
                    className="columns-2 gap-4 sm:columns-3 lg:columns-4"
                  >
                    {batch.items.map((item) => (
                      <CreationTile
                        key={item.id}
                        item={item}
                        onSelect={onSelect}
                        onDelete={setPendingDelete}
                      />
                    ))}
                  </div>
                ),
              )}
            </div>

            {cursor && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  className="h-11"
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

      <DeleteCreationDialog
        open={pendingDelete !== null}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
