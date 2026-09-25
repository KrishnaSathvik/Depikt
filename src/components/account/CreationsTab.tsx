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
      <h2 className="text-heading-md">{CREATIONS_COPY.title}</h2>
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">
        {CREATIONS_COPY.subline}
      </p>
      <div className="mt-5">
        <CreationsGrid onSelect={hub.openCreationDetail} />
      </div>
    </div>
  );
}
