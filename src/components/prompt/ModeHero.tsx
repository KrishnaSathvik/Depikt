/**
 * Shared idle header for Generate / Improve prompt / Critique. Compact on
 * purpose: the homepage launch module owns display-scale type.
 */
export function ModeHero({
  title,
  body,
  compact = true,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <header className="max-w-[36rem]">
      <h2
        className={
          compact
            ? "text-balance text-heading-lg text-[color:var(--text-primary)] sm:text-heading-xl"
            : "text-balance text-display-md text-[color:var(--text-primary)] sm:text-display-lg"
        }
      >
        {title}
      </h2>
      <p
        className={
          compact
            ? "mt-2 max-w-[52ch] text-pretty text-body-md text-[color:var(--text-secondary)]"
            : "mt-3 max-w-[52ch] text-pretty text-body-lg text-[color:var(--text-secondary)]"
        }
      >
        {body}
      </p>
    </header>
  );
}
