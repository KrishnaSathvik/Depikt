import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ScrollRow } from "@/components/ScrollRow";
import { GENERATE_INSPIRATION } from "@/data/generate-inspiration";

const ROW_SLUGS = [
  "showa-travel-poster-exact-title",
  "podcast-cover-art-exact-title",
  "impressionist-san-francisco",
  "app-icon-set-six",
  "holiday-card-exact-greeting",
  "tattoo-flash-sheet",
] as const;

/**
 * One quiet row of real, reviewed results under the Generate composer.
 * Choosing one fills the prompt for review — it never submits.
 */
export function InspirationRow({ onUsePrompt }: { onUsePrompt: (prompt: string) => void }) {
  const items = ROW_SLUGS.map((slug) => GENERATE_INSPIRATION.find((i) => i.slug === slug)!);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">Start from a Library result</p>
        <Link
          to="/library"
          className="inline-flex min-h-11 items-center gap-1 text-body-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] sm:min-h-0"
        >
          More <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ScrollRow ariaLabel="Start from a Library result" innerClassName="gap-2.5 pb-0.5">
        {items.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => onUsePrompt(item.prompt)}
            aria-label={`Use prompt: ${item.title}`}
            className="flex w-[220px] shrink-0 snap-start items-center gap-3 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-2 pr-3 text-left transition-colors hover:border-[color:var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
          >
            <img
              src={`/library/images-2-5/${item.slug}.webp`}
              alt=""
              loading="lazy"
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-[color:var(--text-primary)]">
                {item.title}
              </span>
              <span className="block text-[12px] text-[color:var(--text-tertiary)]">
                {item.category}
              </span>
            </span>
          </button>
        ))}
      </ScrollRow>
    </div>
  );
}
