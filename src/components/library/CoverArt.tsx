import { cn } from "@/lib/utils";

/**
 * Soft hue pairs for image-less Library entries. Hues are picked from a
 * small warm/cool set so neighbouring cards vary without ever looking loud;
 * saturation and lightness stay pastel so the ink title always reads.
 */
const HUE_PAIRS: readonly [number, number][] = [
  [18, 342],
  [32, 8],
  [262, 300],
  [212, 252],
  [168, 200],
  [44, 18],
  [328, 284],
  [146, 186],
];

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic soft gradient for a seed; shared by cards and the detail dialog. */
export function coverGradient(seed: string) {
  const [a, b] = HUE_PAIRS[hash(seed) % HUE_PAIRS.length];
  return [
    `radial-gradient(120% 90% at 0% 0%, hsl(${a} 100% 93%) 0%, transparent 60%)`,
    `radial-gradient(110% 100% at 100% 100%, hsl(${b} 95% 90%) 0%, transparent 62%)`,
    `linear-gradient(135deg, hsl(${a} 80% 97%) 0%, hsl(${b} 70% 95%) 100%)`,
  ].join(", ");
}

/**
 * The intentional placeholder for Library entries with no image (templates,
 * prompts without a result, or a thumbnail that failed to load): a soft
 * gradient tile carrying the category and title, and — for
 * templates — a sketch of the brief's structure.
 */
export function CoverArt({
  seed,
  title,
  kicker,
  variant = "prompt",
  className,
}: {
  seed: string;
  title: string;
  kicker?: string;
  variant?: "prompt" | "template";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ backgroundImage: coverGradient(seed) }}
      className={cn("relative isolate flex h-full w-full overflow-hidden text-left", className)}
    >
      {/* Quiet decoration: a soft light leak and two hairline rings. */}
      <span className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/60 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-16 -right-12 h-48 w-48 rounded-full border border-white/70" />
      <span className="pointer-events-none absolute -bottom-6 -right-2 h-28 w-28 rounded-full border border-white/60" />
      <div className="relative flex w-full flex-col justify-end p-5">
        {variant === "template" && (
          <div className="mb-4 flex w-fit flex-col gap-1.5 rounded-xl border border-white/80 bg-white/60 p-2.5 shadow-[0_8px_20px_-14px_rgba(17,17,17,0.45)] backdrop-blur-sm">
            <span className="h-1.5 w-14 rounded-full bg-[color:var(--text-primary)] opacity-60" />
            <span className="h-1.5 w-20 rounded-full bg-[color:var(--text-primary)] opacity-20" />
            <span className="h-1.5 w-10 rounded-full bg-[color:var(--text-primary)] opacity-20" />
          </div>
        )}
        {kicker && (
          <p className="text-[12px] font-medium text-[color:var(--text-secondary)]">{kicker}</p>
        )}
        <p className="mt-1 line-clamp-3 max-w-[16ch] text-balance text-[22px] font-semibold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)]">
          {title}
        </p>
      </div>
    </div>
  );
}
