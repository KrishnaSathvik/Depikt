import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one page header every top-level page uses: a pill eyebrow, a large
 * headline whose optional second half carries the brand gradient, a short
 * lede, and an optional row of actions. `align="center"` for marketing-style
 * pages (Pricing, Help), left for working pages (Library, Blog).
 */
export function PageHero({
  eyebrow,
  title,
  accent,
  lede,
  actions,
  align = "left",
  className,
  as: Heading = "h1",
}: {
  eyebrow?: string;
  title: string;
  /** Rendered after `title` in the brand gradient. */
  accent?: string;
  lede?: ReactNode;
  actions?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  const centered = align === "center";
  return (
    <header
      className={cn(centered ? "mx-auto max-w-[760px] text-center" : "max-w-[820px]", className)}
    >
      {eyebrow && <p className="badge-eyebrow">{eyebrow}</p>}
      <Heading
        className={cn(
          "text-balance text-[40px] font-semibold leading-[1.03] tracking-[-0.035em] text-[color:var(--text-primary)] sm:text-[60px]",
          eyebrow && "mt-5",
        )}
      >
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-brand-gradient">{accent}</span>
          </>
        )}
      </Heading>
      {lede && (
        <p
          className={cn(
            "mt-5 text-pretty text-[17px] leading-relaxed text-[color:var(--text-secondary)] sm:text-[19px]",
            centered ? "mx-auto max-w-[56ch]" : "max-w-[60ch]",
          )}
        >
          {lede}
        </p>
      )}
      {actions && (
        <div className={cn("mt-8 flex flex-wrap gap-3", centered && "justify-center")}>
          {actions}
        </div>
      )}
    </header>
  );
}
