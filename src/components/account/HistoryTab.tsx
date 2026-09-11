import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock, Trash2 } from "lucide-react";
import {
  useHistory,
  removeHistoryEntry,
  clearAllHistory,
  formatRelativeTime,
} from "@/lib/history-db";
import { migrateLocalStorageHistory } from "@/lib/migrate-history";
import { historyKindLabel } from "@/lib/product";
import type { HistoryRecord } from "@/lib/db";

/**
 * Recent Build/Critique drafts, moved in from /library. Rendered at the
 * public /history route (src/routes/history.tsx), not gated by sign-in —
 * local to this browser (Dexie/IndexedDB), never tied to an account.
 */
export function HistoryTab() {
  const entries = useHistory();
  const navigate = useNavigate();

  // One-time migration from localStorage to IndexedDB (ran on /library before this moved).
  useEffect(() => {
    migrateLocalStorageHistory();
  }, []);

  function handleRestore(entry: HistoryRecord) {
    if (entry.kind === "critique") {
      void navigate({ to: "/prompt", search: { mode: "critique" as const, restore: entry.id } });
    } else {
      void navigate({ to: "/prompt", search: { mode: "build" as const, restore: entry.id } });
    }
  }

  return (
    <div>
      <h1 className="text-heading-md">History</h1>
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">Your recent drafts.</p>

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)]">
              <Clock className="h-4 w-4 text-[color:var(--text-tertiary)]" />
            </div>
            <p className="text-body-sm text-[color:var(--text-tertiary)]">
              No history yet. Build or critique a prompt to get started.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-[13px] text-[color:var(--text-tertiary)]">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </p>
              <button
                onClick={() => {
                  if (confirm("Clear all history? This can't be undone.")) clearAllHistory();
                }}
                className="inline-flex items-center gap-1.5 text-body-sm text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--error)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 gap-px border border-[color:var(--border-subtle)] bg-[color:var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="group relative flex cursor-pointer flex-col gap-3 bg-[color:var(--bg-elevated)] p-6 transition-colors hover:bg-[color:var(--bg-muted)]"
                  onClick={() => handleRestore(entry)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[color:var(--text-primary)]">
                      {historyKindLabel(entry.kind)}
                    </span>
                    {typeof entry.result.category === "string" && (
                      <>
                        <span className="text-[color:var(--text-tertiary)]">·</span>
                        <span className="truncate text-[13px] text-[color:var(--text-secondary)]">
                          {entry.result.category}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="line-clamp-2 text-body-sm text-[color:var(--text-primary)]">
                    {entry.roughIdea}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-[13px] text-[color:var(--text-tertiary)]">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryEntry(entry.id);
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-[color:var(--text-tertiary)] opacity-0 transition-opacity hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--error)] group-hover:opacity-100"
                      aria-label="Remove from history"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
