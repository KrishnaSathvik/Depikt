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
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border text-body-sm font-medium tabular-nums transition-colors";
  const btnInactive =
    "border-[color:var(--border-default)] bg-transparent text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]";
  const btnActive = "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--ink-text)]";
  const btnDisabled = "cursor-not-allowed opacity-40";

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`${btnBase} px-3 gap-1 ${currentPage === 1 ? btnDisabled : btnInactive}`}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex h-10 w-8 items-center justify-center text-[color:var(--text-tertiary)]"
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
        className={`${btnBase} px-3 gap-1 ${currentPage === totalPages ? btnDisabled : btnInactive}`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
