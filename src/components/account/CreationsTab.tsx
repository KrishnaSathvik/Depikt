import { CreationsGrid } from "@/components/account/CreationsGrid";
import { useAccountHub } from "@/components/account/AccountHubProvider";

/**
 * The full-page /account fallback for the "creations" tab. Tapping a
 * thumbnail opens the same AccountHub creation-detail view used
 * everywhere else, not a page-local dialog -- see [[account-hub]].
 */
export function CreationsTab() {
  const hub = useAccountHub();

  return (
    <div>
      <h1 className="text-heading-md">Creations</h1>
      <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">Your generated images.</p>
      <div className="mt-5">
        <CreationsGrid onSelect={hub.openCreationDetail} />
      </div>
    </div>
  );
}
