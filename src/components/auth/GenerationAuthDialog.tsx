import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AuthSurface } from "@/components/auth/AuthSurface";
import type { useGeneration } from "@/lib/generation/use-generation";
import { AUTH_COPY } from "@/lib/product";

/**
 * The in-context provider chooser shown when a signed-out user presses
 * Generate image / Generate rewrite / Apply edit / Regenerate. The pending
 * submission was already persisted by the hook; picking a provider starts
 * OAuth and the hook resumes the exact same submission on return.
 */
export function GenerationAuthDialog({ gen }: { gen: ReturnType<typeof useGeneration> }) {
  return (
    <Dialog open={gen.authPrompt} onOpenChange={(open) => !open && gen.dismissAuthPrompt()}>
      <DialogContent className="max-w-[400px]">
        <DialogTitle className="text-heading-sm">{AUTH_COPY.generateTitle}</DialogTitle>
        <DialogDescription className="text-body-sm text-[color:var(--text-secondary)]">
          {AUTH_COPY.generateBody}
        </DialogDescription>
        <AuthSurface
          mode="sign-up"
          compact
          className="mt-2 max-w-none"
          redirectTo={typeof window !== "undefined" ? window.location.href : undefined}
          onStart={(provider) => gen.chooseAuthProvider(provider)}
        />
      </DialogContent>
    </Dialog>
  );
}
