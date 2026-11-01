import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared page control for the Library and Gallery grids. Both routes keep the
 * current page in their URL search params and pass it in here.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  // Build page numbers: 1, 2, ..., last  (with ellipsis when needed)
  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    // Middle pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    // Always show last page
    pages.push(totalPages);
  }

  const btnBase =
    "inline-flex h-11 min-w-10 items-center justify-center rounded-full text-[14px] font-medium tabular-nums transition-[background-color,color,box-shadow] sm:h-10";
  const btnInactive =
    "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--text-primary)] hover:shadow-[0_1px_2px_rgba(17,17,17,0.06)]";
  const btnActive =
    "bg-[color:var(--ink)] text-[color:var(--ink-text)] shadow-[0_6px_16px_-8px_rgba(17,17,17,0.6)]";
  const btnDisabled = "cursor-not-allowed text-[color:var(--text-quaternary)]";

  return (
    <nav className="mt-12 flex justify-center" aria-label="Pagination">
      <div className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] p-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className={`${btnBase} gap-1 px-2 sm:px-4 ${currentPage === 1 ? btnDisabled : btnInactive}`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex h-10 w-5 items-center justify-center text-[color:var(--text-tertiary)]"
            >
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? "page" : undefined}
              className={`${btnBase} ${p === currentPage ? btnActive : btnInactive}`}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className={`${btnBase} gap-1 px-2 sm:px-4 ${currentPage === totalPages ? btnDisabled : btnInactive}`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
