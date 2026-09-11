import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { PromptSurface } from "@/components/PromptSurface";
import { useIsMobile } from "@/hooks/use-mobile";
import type { useGeneration } from "@/lib/generation/use-generation";
import { generationGateHeadline, promptExcerpt } from "@/lib/auth/gate-copy";
import { AUTH_COPY } from "@/lib/product";

/**
 * The in-context provider chooser shown when a signed-out user presses
 * Generate image / Generate rewrite. The pending submission was already
 * persisted by the hook (prompt, references, ratio, idempotency key);
 * picking a provider starts OAuth and the hook resumes the exact same
 * submission on return — no second click, no "sign up or sign in" choice
 * (every method handles both).
 *
 * Desktop/tablet: centered dialog. Mobile: bottom sheet reaching about
 * two-thirds of the viewport, so the page underneath stays visibly there —
 * scrolling internally, since five sign-in methods need more room than one
 * OAuth button did.
 */
export function AuthGateDialog({ gen }: { gen: ReturnType<typeof useGeneration> }) {
  const isMobile = useIsMobile();
  const open = gen.authPrompt;
  const onOpenChange = (next: boolean) => !next && gen.dismissAuthPrompt();

  const headline = generationGateHeadline(gen.authPromptContext?.sourceType ?? "direct");
  const excerpt = gen.authPromptContext?.prompt
    ? promptExcerpt(gen.authPromptContext.prompt)
    : null;
  const referenceUrl = gen.authPromptContext?.referenceDataUrl ?? null;

  const body = (
    <>
      {excerpt && (
        <div className="mb-4 flex items-start gap-3">
          {referenceUrl && (
            <img
              src={referenceUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-md border border-[color:var(--border-subtle)] object-cover"
            />
          )}
          <PromptSurface bodyClassName="px-3 py-2.5 text-[13px]" className="flex-1">
            {excerpt}
          </PromptSurface>
        </div>
      )}
      <p className="text-body-sm text-[color:var(--text-secondary)]">
        Sign in or create a free account to continue.
      </p>
      <p className="mt-1 text-body-sm font-medium text-[color:var(--text-primary)]">
        {AUTH_COPY.starterCreditsLine}
      </p>
      <AuthSurface
        mode="sign-up"
        compact
        skipOwnSignIn
        busyLabel={AUTH_COPY.signingIn}
        className="mt-5 max-w-none"
        redirectTo={typeof window !== "undefined" ? window.location.href : undefined}
        onStart={(provider) => {
          if (provider !== "email") gen.chooseAuthProvider(provider);
        }}
      />
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetTitle className="text-heading-sm">{headline}</SheetTitle>
          <SheetDescription className="sr-only">{headline}</SheetDescription>
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[440px] overflow-y-auto p-8">
        <DialogTitle className="text-heading-sm">{headline}</DialogTitle>
        <DialogDescription className="sr-only">{headline}</DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  );
}
