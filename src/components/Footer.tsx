/**
 * Shared site footer. Navigation already lives in the header, so this is a
 * single quiet line: wordmark, tagline, copyright.
 */
export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg)]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:px-6 lg:px-12">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Depikt
          </span>
          <span className="text-body-sm text-[color:var(--text-tertiary)]">
            A workspace for better image prompts.
          </span>
        </div>
        <span className="text-body-sm text-[color:var(--text-tertiary)]">
          © {new Date().getFullYear()} Depikt
        </span>
      </div>
    </footer>
  );
}
