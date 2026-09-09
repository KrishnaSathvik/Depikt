import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ANNOUNCEMENT, isAnnouncementLive } from "@/lib/product";

/**
 * Editorial launch module under the homepage header. Text on the left,
 * a small curated strip of real Images 2.5 results on the right; the strip
 * stacks under the text on small screens. Driven by ANNOUNCEMENT in
 * product.ts; renders nothing once the announcement is inactive or expired.
 * Motion is a single reveal plus a slow 3px drift, both disabled under
 * prefers-reduced-motion by the global rule in styles.css.
 */
export function LaunchModule() {
  if (!isAnnouncementLive(ANNOUNCEMENT)) return null;
  const a = ANNOUNCEMENT;

  return (
    <section
      aria-labelledby="launch-heading"
      className="border-b border-[color:var(--border-subtle)]"
    >
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:gap-16 md:py-16 lg:px-12">
        <div className="reveal min-w-0">
          <p className="eyebrow">{a.eyebrow}</p>
          <h2
            id="launch-heading"
            className="mt-4 max-w-[18ch] text-display-md text-[color:var(--text-primary)] md:text-display-lg"
          >
            {a.title}
          </h2>
          <p className="mt-5 max-w-[52ch] text-body-lg text-[color:var(--text-secondary)]">
            {a.body}
          </p>
          {a.meta && (
            <p className="mt-3 text-body-sm font-medium text-[color:var(--text-tertiary)]">
              {a.meta}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <Link
              to="/library"
              search={{ page: 1, view: "browse", collection: a.primary.collection }}
              className="group inline-flex items-center gap-1.5 text-body-lg font-medium text-[color:var(--text-primary)] underline-offset-4 hover:underline"
            >
              {a.primary.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/blog/$slug"
              params={{ slug: a.secondary.slug }}
              className="group inline-flex items-center gap-1.5 text-body-lg text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
            >
              {a.secondary.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Visual proof: five real results, three tall and two wide, on a white canvas. */}
        <ul
          aria-label="Examples from the new Images 2.5 recipes"
          className="reveal grid grid-cols-6 grid-rows-[auto_auto] gap-2 sm:gap-3"
          style={{ animationDelay: "80ms" }}
        >
          {a.images.map((img, i) => (
            <li
              key={img.slug}
              className={`launch-drift overflow-hidden border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] ${
                img.span === "wide" ? "col-span-3 aspect-[16/10]" : "col-span-2 aspect-[3/4]"
              }`}
              style={{ animationDelay: `${i * 700}ms` }}
            >
              <Link
                to="/library"
                search={{ page: 1, view: "browse", collection: a.primary.collection }}
                aria-label={`${img.alt}. Explore the Images 2.5 recipes`}
                className="block h-full w-full"
              >
                <img
                  src={`/library/images-2-5/${img.slug}.webp`}
                  alt={img.alt}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
