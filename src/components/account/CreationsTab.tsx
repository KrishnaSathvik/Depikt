import { CreationsGrid } from "@/components/account/CreationsGrid";
import { useAccountHub } from "@/components/account/AccountHubProvider";
import { CREATIONS_COPY } from "@/lib/product";

/**
 * The full-page /account fallback for the "creations" tab. Tapping a
 * thumbnail opens the same AccountHub creation-detail view used
 * everywhere else, not a page-local dialog -- see [[account-hub]].
 */
export function CreationsTab() {
  const hub = useAccountHub();

  return (
    <div>
      <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-[32px]">
        {CREATIONS_COPY.title}
      </h2>
      <p className="mt-1.5 text-[15px] text-[color:var(--text-secondary)]">
        {CREATIONS_COPY.subline}
      </p>
      <div className="mt-6">
        <CreationsGrid onSelect={hub.openCreationDetail} />
      </div>
    </div>
  );
}
