import { Brush, Globe, Layers, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { HOME_ACTION, type HomeCapability } from "@/lib/product";

/**
 * "Why Depikt": what a generation includes beyond the image itself. Lives on
 * Pricing, next to what a credit buys. Capabilities gated by release flags
 * (grounding, validation) are filtered by `homeCapabilities` before render.
 */
export function Capabilities({ capabilities }: { capabilities: ReadonlyArray<HomeCapability> }) {
  return (
    <section>
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24">
        <PageHero as="h2" eyebrow="Why Depikt" title={HOME_ACTION.capabilitiesTitle} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:mt-16">
          {capabilities.map((c) => {
            const Icon = CAPABILITY_ICONS[c.label] ?? Layers;
            return (
              <div key={c.label} className="surface-card p-7 sm:p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[image:var(--brand-gradient)] text-white shadow-[var(--brand-glow)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-6 text-[13px] font-medium text-[color:var(--text-tertiary)]">
                  {c.label}
                </p>
                <h3 className="mt-2 text-balance text-[22px] font-semibold leading-snug tracking-[-0.02em] text-[color:var(--text-primary)]">
                  {c.heading}
                </h3>
                <p className="mt-3 max-w-[46ch] text-body-md text-[color:var(--text-secondary)]">
                  {c.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Keyed by label so a capability hidden by its release flag never shifts the others' icons.
const CAPABILITY_ICONS: Record<string, typeof Layers> = {
  "Reference Packs": Layers,
  "Precision editing": Brush,
  "Grounded generation": Globe,
  "Validation + refinement": ShieldCheck,
};
