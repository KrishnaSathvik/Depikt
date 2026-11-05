import { Link, useHydrated } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ANNOUNCEMENT, isAnnouncementLive } from "@/lib/product";
import { GENERATE_INSPIRATION } from "@/data/generate-inspiration";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";

/**
 * Homepage hero: what Depikt does, one action to start creating, and the
 * current launch as a quiet pill (driven by ANNOUNCEMENT in product.ts; the
 * pill and collection link drop away once it is inactive or expired) over a slow,
 * edge-faded reel of real Images 2.5 results. The reel pauses on hover and
 * stands still under prefers-reduced-motion (then it scrolls by hand).
 */
export function LaunchModule() {
  const a = ANNOUNCEMENT;
  const live = isAnnouncementLive(a);
  const hydrated = useHydrated();
  const generationEnabled = hydrated && isNativeGenerationEnabled();
  const libraryLink = { page: 1, view: "browse", collection: a.primary.collection } as const;

  // The announcement's picks first, then the rest of the reviewed text-to-image results.
  const reel = [
    ...a.images.map((img) => ({ slug: img.slug, alt: img.alt })),
    ...GENERATE_INSPIRATION.filter((i) => !a.images.some((img) => img.slug === i.slug)).map(
      (i) => ({ slug: i.slug, alt: i.title }),
    ),
  ];

  return (
    <section aria-labelledby="launch-heading" className="px-3 pt-4 sm:px-5">
      <div className="hero-panel relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] sm:rounded-[40px]">
        <div className="reveal relative mx-auto max-w-[920px] px-5 pb-10 pt-12 text-center sm:px-6 md:pb-14 md:pt-20">
          {/* The launch is news, not the product: one quiet pill links to it. */}
          {live && (
            <Link
              to="/blog/$slug"
              params={{ slug: a.secondary.slug }}
              aria-label={`${a.eyebrow}: ${a.title} ${a.secondary.label}`}
              className="group inline-flex max-w-full items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-white/75 py-1 pl-1 pr-3 text-[13px] font-medium text-[color:var(--text-secondary)] backdrop-blur transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
            >
              <span className="shrink-0 whitespace-nowrap rounded-full bg-[image:var(--brand-gradient)] px-2 py-0.5 text-[12px] text-white">
                {a.eyebrow}
              </span>
              <span className="truncate">{a.title}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          <h1
            id="launch-heading"
            className="mx-auto mt-6 max-w-[14ch] text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-[color:var(--text-primary)] md:text-[76px]"
          >
            Better prompts. <span className="text-brand-gradient">Better images.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[54ch] text-pretty text-[17px] leading-relaxed text-[color:var(--text-secondary)] md:text-[20px]">
            {generationEnabled
              ? "Generate images, turn rough ideas into precise prompts, and find out what your prompts are missing — all in one place."
              : "Turn rough ideas into precise prompts and find out what your prompts are missing — for ChatGPT Images."}
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/"
              hash="create"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[image:var(--brand-gradient)] px-7 text-[15px] font-medium text-white shadow-[var(--brand-glow)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
            >
              Start creating
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/library"
              search={live ? libraryLink : undefined}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[color:var(--border-default)] bg-white/70 px-7 text-[15px] font-medium text-[color:var(--text-primary)] backdrop-blur transition-colors hover:border-[color:var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
            >
              {live ? a.primary.label : "Browse the Library"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Reel of real results. Rendered twice so the loop is seamless; the copy is hidden from assistive tech. */}
        <div
          className="hero-reel relative pb-10 sm:pb-16 md:pb-20"
          aria-label="Examples from the Images 2.5 collection"
        >
          <div className="hero-reel-track flex w-max">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                className="flex gap-3 pr-3 sm:gap-4 sm:pr-4 md:gap-5 md:pr-5"
                aria-hidden={copy === 1 || undefined}
              >
                {reel.map((img, i) => (
                  <li
                    key={img.slug}
                    className={`h-[168px] w-[126px] shrink-0 overflow-hidden rounded-2xl bg-[color:var(--bg-subtle)] shadow-[0_20px_40px_-24px_rgba(17,17,17,0.5)] ring-1 ring-black/5 sm:h-[240px] sm:w-[180px] md:h-[300px] md:w-[225px] ${
                      i % 2 === 1 ? "mt-5 sm:mt-8" : ""
                    }`}
                  >
                    <Link
                      to="/library"
                      search={libraryLink}
                      tabIndex={copy === 1 ? -1 : undefined}
                      aria-label={`${img.alt}. ${a.primary.label}`}
                      className="block h-full"
                    >
                      <img
                        src={`/library/images-2-5/${img.slug}.webp`}
                        alt=""
                        loading={i < 6 ? "eager" : "lazy"}
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
