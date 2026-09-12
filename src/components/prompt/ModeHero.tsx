/**
 * Shared idle header for Generate / Build / Critique. The page chrome already
 * shows the mode name as an eyebrow + tabs, so this is only title + one line.
 */
export function ModeHero({ title, body }: { title: string; body: string }) {
  return (
    <header className="max-w-[36rem]">
      <h2 className="text-balance text-display-md text-[color:var(--text-primary)] sm:text-display-lg">
        {title}
      </h2>
      <p className="mt-3 max-w-[52ch] text-pretty text-body-lg text-[color:var(--text-secondary)]">
        {body}
      </p>
    </header>
  );
}
