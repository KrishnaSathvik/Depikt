import { ArrowDown, ArrowRight, ScanSearch } from "lucide-react";
import { GENERATE_INSPIRATION } from "@/data/generate-inspiration";

const SHOWCASE_SLUGS = [
  "showa-travel-poster-exact-title",
  "app-icon-set-six",
  "podcast-cover-art-exact-title",
] as const;

/**
 * Improve prompt, idle: three real Library recipes shown as the journey the
 * tool is for — rough idea → finished prompt → reviewed result. "Try this
 * idea" fills the composer with the rough idea only; it never submits.
 */
export function ImproveShowcase({ onTryIdea }: { onTryIdea: (idea: string) => void }) {
  const items = GENERATE_INSPIRATION.filter((item) =>
    SHOWCASE_SLUGS.some((slug) => slug === item.slug),
  );
  return (
    <section aria-labelledby="improve-showcase-heading" className="space-y-5">
      <div className="text-center">
        <p className="eyebrow">From the Library</p>
        <h3
          id="improve-showcase-heading"
          className="mt-1 text-heading-lg text-[color:var(--text-primary)]"
        >
          From a rough idea to a finished prompt
        </h3>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.slug}
            className="flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[color:var(--bg-subtle)]">
              <img
                src={`/library/images-2-5/${item.slug}.webp`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
                Rough idea
              </p>
              <p className="mt-1 text-body-sm text-[color:var(--text-primary)]">{item.idea}</p>
              <ArrowDown className="my-3 h-4 w-4 text-[color:var(--text-quaternary)]" aria-hidden />
              <p className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
                Finished prompt
              </p>
              <p className="mt-1 line-clamp-4 font-mono text-[12px] leading-relaxed text-[color:var(--text-secondary)]">
                {item.prompt}
              </p>
              <button
                type="button"
                onClick={() => onTryIdea(item.idea)}
                className="mt-5 inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border border-[color:var(--border-default)] px-4 text-[13px] font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] sm:min-h-9"
              >
                Try this idea <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SAMPLE_SCORES: ReadonlyArray<[string, number]> = [
  ["Intent fidelity", 8],
  ["Clarity", 6],
  ["Contradictions", 9],
  ["Efficiency", 5],
];
const SAMPLE_FIXES: ReadonlyArray<[string, string]> = [
  ["Lighting is unspecified", "Name the light's direction and quality."],
  ["Composition is open", "Say how the subject is framed."],
  ["Padding words", "Cut “stunning, 8K, masterpiece” — they change nothing."],
];

/** Critique, idle: what a report looks like — score, core dimensions, top fixes. */
export function CritiqueShowcase() {
  return (
    <section aria-labelledby="critique-showcase-heading" className="space-y-5">
      <div className="text-center">
        <p className="eyebrow">Example report</p>
        <h3
          id="critique-showcase-heading"
          className="mt-1 text-heading-lg text-[color:var(--text-primary)]"
        >
          A score, the reasons, and the fixes that matter most
        </h3>
      </div>
      <div className="grid overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] md:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="border-b border-[color:var(--border-subtle)] p-6 md:border-b-0 md:border-r">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[56px] font-medium leading-none tracking-[-0.04em] text-[color:var(--text-primary)]">
              6.4
            </span>
            <span className="text-body-sm text-[color:var(--text-tertiary)]">/ 10</span>
          </div>
          <p className="mt-2 text-body-sm text-[color:var(--text-secondary)]">
            Good foundation, needs direction.
          </p>
        </div>
        <dl className="space-y-4 border-b border-[color:var(--border-subtle)] p-6 md:border-b-0 md:border-r">
          {SAMPLE_SCORES.map(([name, score]) => (
            <div key={name} className="flex flex-wrap justify-between text-[13px]">
              <dt className="text-[color:var(--text-secondary)]">{name}</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">{score}</dd>
              <dd
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--bg-subtle)]"
              >
                <div
                  className="h-full rounded-full bg-[color:var(--text-primary)]"
                  style={{ width: `${score * 10}%` }}
                />
              </dd>
            </div>
          ))}
        </dl>
        <ol className="space-y-3 p-6">
          {SAMPLE_FIXES.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--bg-subtle)] text-[12px] font-medium">
                {i + 1}
              </span>
              <span className="text-body-sm">
                <span className="block font-medium text-[color:var(--text-primary)]">{title}</span>
                <span className="text-[color:var(--text-secondary)]">{body}</span>
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 pt-2 text-[12px] text-[color:var(--text-tertiary)]">
            <ScanSearch className="h-3.5 w-3.5" aria-hidden /> Then: a full rewritten prompt, ready
            to generate.
          </li>
        </ol>
      </div>
    </section>
  );
}
